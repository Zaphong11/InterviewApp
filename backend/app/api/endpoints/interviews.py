from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.db.models import User, Job, Interview, InterviewStatus
from app.schemas import interview as interview_schema
from pydantic import BaseModel
from app.services.grading_service import grade_answer
from sqlalchemy.orm.attributes import flag_modified

router = APIRouter()

class StartInterviewRequest(BaseModel):
    job_id: int

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

@router.get("/{interview_id}", response_model=interview_schema.InterviewCandidateView)
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user) # Allow any authenticated user to try, but we check ownership
):
    """
    Lấy thông tin phỏng vấn.
    Ẩn criteria (đáp án) khỏi kết quả trả về cho Candidate.
    """
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Check ownership or role
    # Candidate can only see their own interview
    if current_user.role == "candidate" and interview.candidate_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized to view this interview")
    
    # Business/Admin might be allowed to see all (or specific logic), 
    # but for now let's just allow the candidate to see their own.
    # If the user is the recruiter of the job, they should probably see the full version (with criteria),
    # but this endpoint uses InterviewCandidateView which HIDES criteria.
    # So this endpoint is specifically for the "Taking Interview" view.
    
    return interview
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
    
    # 3. Grade Answer
    grading_result = grade_answer(
        question=question_data["question_text"],
        criteria=question_data["criteria"],
        user_answer=request.answer_text
    )
    
    # 4. Update Content
    question_data["user_answer"] = request.answer_text
    question_data["ai_grade"] = grading_result["score"]
    question_data["ai_feedback"] = grading_result["feedback"] # Store feedback if needed in schema, currently schema has ai_grade only in Question model but we can add it to dict
    
    # Update the list in the content dict
    questions[request.question_id] = question_data
    interview.content["questions"] = questions
    
    # Explicitly flag modified for JSONB
    flag_modified(interview, "content")
    
    # 5. Update Total Score
    total_score = sum([q.get("ai_grade", 0) or 0 for q in questions])
    interview.total_score = total_score
    
    db.commit()
    db.refresh(interview)
    
    # 6. Determine Next Question
    next_question_id = request.question_id + 1 if request.question_id + 1 < len(questions) else None
    
    return {
        "score": grading_result["score"],
        "feedback": grading_result["feedback"],
        "next_question_id": next_question_id
    }
