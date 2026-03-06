from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Application, ApplicationNote, Job, User, Role
from app.api.deps import get_current_user
from typing import List

from app.schemas import application as app_schema
from app.api import deps

router = APIRouter()

@router.post("/", response_model=app_schema.Application)
def apply_for_job(
    application_in: app_schema.ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Candidate nộp đơn ứng tuyển cho một Job.
    """
    if current_user.role != Role.CANDIDATE:
         raise HTTPException(status_code=403, detail="Only candidates can apply")

    job = db.query(Job).filter(Job.id == application_in.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check already applied
    existing_app = db.query(Application).filter(
        Application.job_id == application_in.job_id,
        Application.candidate_id == current_user.id
    ).first()
    if existing_app:
        raise HTTPException(status_code=400, detail="Already applied to this job")

    application = Application(
        **application_in.dict(),
        candidate_id=current_user.id
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application

@router.get("/job/{job_id}", response_model=List[app_schema.Application])
def get_applications_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowBusiness)
):
    """
    Lấy danh sách Application của một Job (dùng cho Kanban bảng).
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.recruiter_id != current_user.id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    applications = db.query(Application).filter(Application.job_id == job_id).all()
    return applications

@router.put("/{app_id}/stage", response_model=app_schema.Application)
def update_application_stage(
    app_id: int,
    update_in: app_schema.ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowBusiness)
):
    """
    Cập nhật stage hoặc status của Application. (Drag and Drop UI gọi API này)
    """
    application = db.query(Application).filter(Application.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job = application.job
    if job.recruiter_id != current_user.id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    if update_in.stage:
        application.stage = update_in.stage
    if update_in.status:
        application.status = update_in.status

    db.commit()
    db.refresh(application)
    return application

@router.post("/{app_id}/notes", response_model=app_schema.ApplicationNote)
def add_application_note(
    app_id: int,
    note_in: app_schema.ApplicationNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowBusiness)
):
    """
    Business user thêm note cho một Application.
    """
    application = db.query(Application).filter(Application.id == app_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    job = application.job
    if job.recruiter_id != current_user.id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")

    note = ApplicationNote(
        **note_in.dict(),
        application_id=app_id,
        recruiter_id=current_user.id
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
