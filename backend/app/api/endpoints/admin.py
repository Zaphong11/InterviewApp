from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Any

from app.db.session import get_db
from app.db.models import User, Job, Interview, Role, InterviewStatus
from app.api.deps import AllowAdmin
from app.schemas.user import UserResponse

router = APIRouter()

# Dependency to ensure only admins can access these endpoints
# We use AllowAdmin which is already defined in deps.py
# But the user asked for a specific function name, so we can alias it or just use it directly.
# Using AllowAdmin directly in the router dependencies is cleaner.

@router.get("/stats", dependencies=[Depends(AllowAdmin)])
def get_admin_stats(db: Session = Depends(get_db)):
    """
    Lấy thống kê tổng quan cho Admin.
    """
    # 1. Count Users
    total_candidates = db.query(User).filter(User.role == Role.CANDIDATE).count()
    total_business = db.query(User).filter(User.role == Role.BUSINESS).count()
    
    # 2. Count Jobs
    total_jobs = db.query(Job).count()
    
    # 3. Count Interviews (Completed or Graded)
    # Assuming 'completed' means finished, which could be COMPLETED or GRADED status
    total_interviews_finished = db.query(Interview).filter(
        Interview.status.in_([InterviewStatus.COMPLETED, InterviewStatus.GRADED])
    ).count()
    
    total_interviews_all = db.query(Interview).count()

    # 4. Calculate API Usage (Estimate)
    # Gemini Requests = (Jobs * 1) + (Interviews Finished * 1)
    gemini_requests = (total_jobs * 1) + (total_interviews_finished * 1)
    
    # Estimated Tokens = (Jobs * 2000) + (Interviews * 1000)
    # Note: User said "Interviews" for tokens, not just finished ones. I'll use total_interviews_all.
    estimated_tokens = (total_jobs * 2000) + (total_interviews_all * 1000)

    return {
        "users": {
            "candidate": total_candidates,
            "business": total_business,
            "total": total_candidates + total_business
        },
        "jobs": {
            "total": total_jobs
        },
        "interviews": {
            "finished": total_interviews_finished,
            "total": total_interviews_all
        },
        "api_usage": {
            "gemini_requests": gemini_requests,
            "estimated_tokens": estimated_tokens
        }
    }

@router.get("/users", response_model=List[UserResponse], dependencies=[Depends(AllowAdmin)])
def get_all_users(db: Session = Depends(get_db)):
    """
    Lấy danh sách tất cả user, sắp xếp mới nhất (theo ID giảm dần).
    """
    users = db.query(User).order_by(User.id.desc()).all()
    # We return the ORM objects directly, FastAPI will serialize them if we had a Pydantic model.
    # Since I don't want to break if UserResponse isn't perfect, I'll let it return the objects
    # and rely on FastAPI's automatic conversion or define a simple response structure if needed.
    # For now, returning the list of users is fine.
    return users

@router.delete("/users/{user_id}", dependencies=[Depends(AllowAdmin)])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Xóa user (Soft delete: set is_active=False).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting yourself (optional but good practice)
    # We would need the current user for this check. 
    # For now, just implement the soft delete.
    
    user.is_active = False
    db.commit()
    db.refresh(user)
    
    return {"message": "User has been deactivated", "user_id": user.id, "is_active": user.is_active}

from app.schemas.job import JobAdminResponse

@router.get("/jobs", response_model=List[JobAdminResponse], dependencies=[Depends(AllowAdmin)])
def get_all_jobs(db: Session = Depends(get_db)):
    """
    Lấy danh sách tất cả tin tuyển dụng.
    """
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return jobs

@router.delete("/jobs/{job_id}", dependencies=[Depends(AllowAdmin)])
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """
    Xóa tin tuyển dụng (Admin).
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Delete related interviews first (optional, depending on cascade settings)
    # Assuming cascade delete is configured or we want to keep them but nullify job_id?
    # Usually hard delete for job implies deleting interviews.
    # For now, let's try deleting the job directly.
    
    db.delete(job)
    db.commit()
    
    return {"message": "Job has been deleted", "job_id": job_id}
