from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Resume, User, ResumeStatus
from app.api import deps
from app.services.resume_analyzer import analyze_resume_with_gemini

router = APIRouter()


@router.get("/me")
def get_my_resume_review(
        db: Session = Depends(get_db),
        current_user: User = Depends(deps.get_current_user)
):
    """
    Lấy điểm đánh giá CV hiện tại của ứng viên.
    Nếu chưa có, tạo một bản ghi rỗng với trạng thái PENDING.
    """
    resume = db.query(Resume).filter(Resume.candidate_id == current_user.id).first()

    if not resume:
        if not current_user.cv_url:
            return {
                "status": "NO_CV",
                "score": None,
                "feedback": None,
                "created_at": None,
                "cv_url": None
            }

        return {
            "status": "NOT_STARTED",
            "score": None,
            "feedback": None,
            "created_at": None,
            "cv_url": current_user.cv_url
        }

    return {
        "status": resume.status.value,
        "score": resume.score,
        "feedback": resume.feedback,
        "created_at": resume.created_at,
        "cv_url": current_user.cv_url
    }


@router.post("/analyze")
def analyze_my_resume(
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        current_user: User = Depends(deps.get_current_user)
):
    """
    Kích hoạt quá trình chấm điểm CV. Backend sẽ kiểm tra file PDF, đọc raw text và chuyển cho AI.
    """
    if not current_user.cv_url:
        raise HTTPException(status_code=400, detail="Vui lòng cập nhật CV trước khi yêu cầu chấm điểm.")
    resume = db.query(Resume).filter(Resume.candidate_id == current_user.id).first()
    if not resume:
        resume = Resume(
            candidate_id=current_user.id,
            raw_text="",
            status=ResumeStatus.PENDING
        )
        db.add(resume)
    else:
        resume.status = ResumeStatus.PENDING
        resume.score = None
        resume.feedback = None

    db.commit()
    db.refresh(resume)
    # Run in background
    background_tasks.add_task(analyze_resume_with_gemini, resume.id, db)

    return {"message": "Đã xếp hàng yêu cầu đánh giá CV", "status": resume.status.value}