from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.db.models import User, Job, Application, ApplicationStatus, Role
from app.schemas import application as application_schema
from app.services.cv_analyzer import analyze_cv_with_gemini
from typing import List

router = APIRouter()


@router.post("/", response_model=application_schema.Application)
def create_application(
        app_in: application_schema.ApplicationCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        current_user: User = Depends(deps.AllowCandidate)
):
    # Check Job exists
    job = db.query(Job).filter(Job.id == app_in.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # Check if candidate has CV
    if not current_user.cv_url and not current_user.resumes:
        raise HTTPException(status_code=400, detail="Vui lòng cập nhật CV trước khi nộp đơn.")
    # Check already applied
    existing_app = db.query(Application).filter(
        Application.job_id == app_in.job_id,
        Application.candidate_id == current_user.id
    ).first()

    if existing_app:
        return existing_app

    application = Application(
        job_id=job.id,
        candidate_id=current_user.id,
        status=ApplicationStatus.SCREENING
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    # Add background task
    background_tasks.add_task(analyze_cv_with_gemini, application.id, db)
    return application


@router.patch("/{app_id}/status", response_model=application_schema.Application)
def update_application_status(
        app_id: int,
        status_update: application_schema.ApplicationStatusUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(deps.AllowBusiness)
):
    application = db.query(Application).filter(Application.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    # Check recruiter permission
    job = db.query(Job).filter(Job.id == application.job_id).first()
    if job.recruiter_id != current_user.id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    application.status = status_update.status
    db.commit()
    db.refresh(application)
    return application


@router.get("/me", response_model=List[application_schema.ApplicationCandidateView])
def get_my_applications(
        db: Session = Depends(get_db),
        current_user: User = Depends(deps.AllowCandidate)
):
    results = db.query(
        Application, User.full_name.label("candidate_name"), User.email.label("candidate_email"), User.cv_url,
        Job.title.label("job_title")
    ).join(User, Application.candidate_id == User.id).join(Job, Application.job_id == Job.id).filter(
        Application.candidate_id == current_user.id
    ).order_by(Application.created_at.desc()).all()

    apps_data = []
    for app, name, email, cv_url, job_title in results:
        app_dict = app.__dict__.copy()
        app_dict["candidate_name"] = name
        app_dict["candidate_email"] = email
        app_dict["cv_url"] = cv_url
        app_dict["job_title"] = job_title
        apps_data.append(app_dict)

    return apps_data
