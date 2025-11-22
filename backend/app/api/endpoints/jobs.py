from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Job, User, Role
from app.services.pdf_service import parse_interview_pdf
from app.api.deps import get_current_user
from typing import Any

router = APIRouter()

@router.post("/{job_id}/upload-script", response_model=Any)
async def upload_interview_script(
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload PDF interview script, parse it using AI, and save to Job.questions_template.
    Only the recruiter who created the job can upload.
    """
    # 1. Check if job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 2. Check permission (must be the recruiter who created the job)
    # Assuming recruiter_id is the user's id.
    # Also allow ADMIN? For now, stick to recruiter.
    if job.recruiter_id != current_user.id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")

    # 3. Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # 4. Read file content
    content = await file.read()

    # 5. Parse PDF using Service
    try:
        extracted_data = parse_interview_pdf(content)
    except Exception as e:
        import logging
        logging.error(f"Error parsing PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

    # 6. Update Job in DB
    # extracted_data is a dict like {'questions': [...]}
    # We save the list of questions to questions_template
    if "questions" in extracted_data:
        job.questions_template = extracted_data["questions"]
    else:
         # Fallback if structure is different, though service ensures it.
        job.questions_template = extracted_data

    db.commit()
    db.refresh(job)

    return job.questions_template
