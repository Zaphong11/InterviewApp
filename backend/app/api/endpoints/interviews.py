from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.db.models import User, Job, Interview, InterviewStatus
from app.schemas import interview as interview_schema
from typing import Union, List
from pydantic import BaseModel
from app.services.grading_service import grade_answer
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import desc

router = APIRouter()

class StartInterviewRequest(BaseModel):
    job_id: int

@router.get("/me", response_model=List[interview_schema.InterviewListItem])
def get_my_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowCandidate)
):
    """
    Lấy lịch sử phỏng vấn của candidate hiện tại.
    """
    results = db.query(
        Interview.id,
        Interview.created_at,
        Interview.status,
        Interview.total_score,
        Interview.decision,
        Job.title.label("job_title")
    ).join(Job, Interview.job_id == Job.id)\
    .filter(Interview.candidate_id == current_user.id)\
    .order_by(desc(Interview.created_at))\
    .all()

    return results

@router.post("/start", response_model=interview_schema.Interview)
def start_interview(
    request: StartInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowCandidate)
):
    """
    Bắt đầu phỏng vấn cho một Job.
    User phải là Candidate.
    """
    # 1. Tìm Job
    job = db.query(Job).filter(Job.id == request.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check if interview already exists for this candidate and job
    existing_interview = db.query(Interview).filter(
        Interview.job_id == request.job_id,
        Interview.candidate_id == current_user.id
    ).first()
    if existing_interview:
        return existing_interview
    
    if not job.questions_template:
        raise HTTPException(status_code=400, detail="Job does not have questions template")

    # 2. Map questions_template -> InterviewContent
    # questions_template là list of dict (từ JSONB)
    # Cấu trúc mong đợi của questions_template: [{"question_text": "...", "criteria": [...]}]
    
    questions_data = []
    for q in job.questions_template:
        # Validate structure if needed, or assume it matches
        # Create Question object structure
        # Ensure criteria has required fields
        criteria_list = []
        for c in q.get("criteria", []):
            criteria_list.append({
                "keyword": c.get("keyword", "Unknown"),
                "score": c.get("score", 0.0)
            })

        question_obj = {
            "question_text": q.get("question_text", "Untitled Question"),
            "criteria": criteria_list,
            "user_answer": None,
            "ai_grade": None
        }
        questions_data.append(question_obj)

    interview_content = {"questions": questions_data}

    # 3. Tạo Interview
    new_interview = Interview(
        job_id=job.id,
        candidate_id=current_user.id,
        status=InterviewStatus.IN_PROGRESS,
        content=interview_content
    )
    
    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)
    
    return new_interview

@router.get("/{interview_id}", response_model=Union[interview_schema.Interview, interview_schema.InterviewCandidateView])
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user) # Allow any authenticated user to try, but we check ownership
):
    """
    Lấy thông tin phỏng vấn.
    Ẩn criteria (đáp án) khỏi kết quả trả về cho Candidate.
    """
    from sqlalchemy.orm import joinedload
    interview = db.query(Interview).options(joinedload(Interview.candidate)).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Check ownership or role
    if current_user.role == "candidate":
        if interview.candidate_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to view this interview")
        return interview # Returns InterviewCandidateView (pydantic will filter)
    
    # If business/admin, check if they own the job (optional but good practice)
    # For now, allow business to see full details
    if current_user.role == "business":
        job = db.query(Job).filter(Job.id == interview.job_id).first()
        if job.recruiter_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not authorized to view this interview")
        return interview # Returns full Interview

    return interview

@router.post("/{interview_id}/submit", response_model=interview_schema.SubmitAnswerResponse)
def submit_answer(
    interview_id: int,
    request: interview_schema.SubmitAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowCandidate)
):
    """
    Nộp câu trả lời cho một câu hỏi.
    Chấm điểm ngay lập tức bằng AI.
    """
    # 1. Get Interview
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # 2. Find Question
    questions = interview.content.get("questions", [])
    if request.question_id < 0 or request.question_id >= len(questions):
        raise HTTPException(status_code=400, detail="Invalid question_id")
    
    question_data = questions[request.question_id]
    
    # 3. Save Answer (No Grading)
    # grading_result = grade_answer(...) -> REMOVED
    
    # 4. Update Content
    question_data["user_answer"] = request.answer_text
    question_data["ai_grade"] = None # Reset grade if re-answering
    question_data["ai_feedback"] = None
    
    # Update the list in the content dict
    questions[request.question_id] = question_data
    interview.content["questions"] = questions
    
    # Explicitly flag modified for JSONB
    flag_modified(interview, "content")
    
    # 5. Update Total Score -> REMOVED (will be done in finish)
    
    db.commit()
    # db.refresh(interview) -> Not strictly needed if we just return status
    
    return {"status": "saved"}


@router.post("/{interview_id}/finish", response_model=interview_schema.FinishInterviewResponse)
def finish_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowCandidate)
):
    """
    Nộp bài và chấm điểm toàn bộ (Batch Grading).
    """
    # 1. Get Interview
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    if interview.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    questions = interview.content.get("questions", [])
    total_score = 0.0
    
    # 2. Batch Grading
    for q in questions:
        # Only grade if there is an answer and not yet graded (or force re-grade?)
        # Let's grade if user_answer exists.
        if q.get("user_answer"):
             # Call Grading Service
             grading_result = grade_answer(
                question=q["question_text"],
                criteria=q.get("criteria", []),
                user_answer=q["user_answer"]
            )
             q["ai_grade"] = grading_result["score"]
             q["ai_feedback"] = grading_result["feedback"]
             
             total_score += grading_result["score"]
        else:
            # No answer -> 0 score
            q["ai_grade"] = 0.0
            q["ai_feedback"] = "Không có câu trả lời."

    # 3. Generate Summary
    from app.services.grading_service import generate_final_summary
    summary = generate_final_summary(questions)
    
    # 4. Update Interview
    interview.content["questions"] = questions
    flag_modified(interview, "content")
    
    interview.total_score = total_score
    interview.ai_feedback = summary # Save summary to ai_feedback column
    interview.status = InterviewStatus.COMPLETED
    
    db.commit()
    db.refresh(interview)
    
    return {
        "total_score": total_score,
        "message": "Graded successfully",
        "summary": summary
    }

@router.put("/{interview_id}/decision", response_model=interview_schema.Interview)
def update_decision(
    interview_id: int,
    decision_update: interview_schema.InterviewDecisionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Cập nhật quyết định tuyển dụng (ACCEPTED/REJECTED).
    Chỉ Recruiter (chủ Job) hoặc Admin mới được gọi.
    """
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    # Check permissions
    if current_user.role == "admin":
        pass # Admin can do anything
    elif current_user.role == "business":
        job = db.query(Job).filter(Job.id == interview.job_id).first()
        if job.recruiter_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this interview")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Update decision
    interview.decision = decision_update.decision
    db.commit()
    db.refresh(interview)
    
    return interview
