from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from app.api import deps
from app.db.session import get_db
from app.db.models import User, Job, Interview, InterviewStatus, Campaign, CampaignStage
from app.schemas import interview as interview_schema
from typing import Union, List
from pydantic import BaseModel
from app.services.grading_service import grade_answer
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import desc
import os
from app.services.pdf_service import parse_interview_pdf

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
        Interview.job_id,
        Interview.content,
        Job.title.label("job_title")
    ).join(Job, Interview.job_id == Job.id)\
    .filter(Interview.candidate_id == current_user.id)\
    .order_by(desc(Interview.created_at))\
    .all()

    final_results = []
    for r in results:
        stage_name = r.content.get("stage_name", "") if r.content else ""
        title = r.job_title
        if stage_name and stage_name != "Phỏng vấn trực tuyến":
             title = f"{title} - {stage_name}"
        final_results.append({
            "id": r.id,
            "job_id": r.job_id,
            "job_title": title,
            "created_at": r.created_at,
            "status": r.status,
            "total_score": r.total_score,
            "decision": r.decision
        })

    return final_results

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
    # 1. Tìm Job kèm Campaign
    job = db.query(Job).options(selectinload(Job.campaign).selectinload(Campaign.stages)).filter(Job.id == request.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing_interviews = db.query(Interview).filter(
        Interview.job_id == request.job_id,
        Interview.candidate_id == current_user.id
    ).order_by(Interview.created_at.asc()).all()

    if existing_interviews:
        last_interview = existing_interviews[-1]
        if last_interview.status in [InterviewStatus.PENDING, InterviewStatus.IN_PROGRESS]:
            return last_interview

    # Check for Campaign logic
    if job.campaign and job.campaign.stages:
        stages = sorted(job.campaign.stages, key=lambda x: x.stage_order)
        next_stage_index = len(existing_interviews)

        if next_stage_index > 0:
            # Check passing rule
            if job.campaign.passing_rule == "PASS_ALL":
                if any(i.decision == "REJECTED" for i in existing_interviews):
                    raise HTTPException(status_code=403, detail="Bạn đã trượt một vòng phỏng vấn, không thể tiếp tục.")
            elif job.campaign.passing_rule == "NO_CONDITION":
                pass # Ứng viên thi liên tục mà không bao giờ bị chặn

        if next_stage_index >= len(stages):
            raise HTTPException(status_code=400, detail="Bạn đã hoàn thành tất cả các vòng phỏng vấn.")
        
        current_stage = stages[next_stage_index]
        
        if not current_stage.pdf_context_url:
             raise HTTPException(status_code=400, detail="Vòng phỏng vấn không có kịch bản.")
             
        filename = current_stage.pdf_context_url.split('/')[-1]
        file_path = os.path.join("app", "uploads", "campaigns", filename)
        
        if not os.path.exists(file_path):
             raise HTTPException(status_code=404, detail="File kịch bản không tồn tại trên hệ thống.")
             
        with open(file_path, "rb") as f:
             pdf_content = f.read()
             
        try:
             extracted_data = parse_interview_pdf(pdf_content)
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Lỗi phân tích kịch bản vòng thi bằng AI: {str(e)}")
             
        # ExtractionResult or dict
        questions_temp = extracted_data.get("questions", extracted_data) if isinstance(extracted_data, dict) else getattr(extracted_data, "questions", extracted_data)
        ai_model = current_stage.ai_model
        stage_name = current_stage.stage_name
    else:
        # Legacy
        if existing_interviews:
             raise HTTPException(status_code=400, detail="Bạn đã hoàn thành phỏng vấn cho vị trí này.")
        
        if not job.questions_template:
            # Fallback instead of raising 400
            questions_temp = [
                {
                    "question_text": "Hãy giới thiệu về bản thân bạn",
                    "criteria": [{"keyword": "Kinh nghiệm", "score": 5}, {"keyword": "Chuyên môn", "score": 5}]
                }
            ]
        else:
            questions_temp = job.questions_template
            
        ai_model = "qwen3.5:4b"
        stage_name = "Phỏng vấn trực tuyến"

    # 1.5 Auto-create an Application for ATS Board
    from app.db.models import Application, ApplicationStage
    
    existing_application = db.query(Application).filter(
        Application.job_id == request.job_id,
        Application.candidate_id == current_user.id
    ).first()
    
    if not existing_application:
        new_app = Application(
            job_id=job.id,
            candidate_id=current_user.id,
            cv_url=current_user.cv_url, # Lấy CV hiện tại trong profile của user mang sang
            stage=ApplicationStage.SCREENING
        )
        db.add(new_app)
        db.flush() # Flush để lấy ID nếu cần, commit sẽ gom chung ở dưới

    # 2. Map questions_template -> InterviewContent
    questions_data = []
    
    # Handle both dict and object structures
    questions_list = questions_temp if isinstance(questions_temp, list) else [questions_temp]
    
    for q in questions_list:
        if isinstance(q, dict):
            q_text = q.get("question_text", "Untitled Question")
            q_criteria = q.get("criteria", [])
        else:
            q_text = getattr(q, 'question_text', "Untitled Question")
            q_criteria = getattr(q, 'criteria', [])

        criteria_list = []
        for c in q_criteria:
            if isinstance(c, dict):
                criteria_list.append({
                    "keyword": c.get("keyword", "Unknown"),
                    "score": c.get("score", c.get("points", 0.0))
                })
            else:
                criteria_list.append({
                    "keyword": getattr(c, 'keyword', "Unknown"),
                    "score": getattr(c, 'score', getattr(c, 'points', 0.0))
                })

        question_obj = {
            "question_text": q_text,
            "criteria": criteria_list,
            "user_answer": None,
            "ai_grade": None
        }
        questions_data.append(question_obj)

    interview_content = {
        "stage_name": stage_name,
        "ai_model": ai_model,
        "questions": questions_data
    }

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
    ai_model = interview.content.get("ai_model", "qwen3.5:4b") # Dynamic AI model map
    total_score = 0.0
    
    # 2. Batch Grading
    for q in questions:
        if q.get("user_answer"):
             # Call Grading Service
             grading_result = grade_answer(
                question=q["question_text"],
                criteria=q.get("criteria", []),
                user_answer=q["user_answer"],
                model_name=ai_model
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
    summary = generate_final_summary(questions, model_name=ai_model)
    
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
