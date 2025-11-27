from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.db.models import Job, User, Role, Interview
from app.services.pdf_service import parse_interview_pdf
from app.api.deps import get_current_user
from typing import Any, List

from app.schemas import job as job_schema
from app.api import deps

router = APIRouter()

@router.post("/", response_model=job_schema.Job)
def create_job(
    job_in: job_schema.JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowBusiness)
):
    """
    Tạo Job mới.
    Chỉ Business mới được tạo.
    """
    job = Job(
        **job_in.dict(),
        recruiter_id=current_user.id
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

@router.get("/", response_model=List[job_schema.Job])
def read_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user_optional),
    skip: int = 0,
    limit: int = 100
):
    """
    Retrieve jobs.
    If user is business/recruiter, return only their jobs.
    Otherwise (Admin, Candidate, Anonymous), return all jobs.
    """
    query = db.query(
        Job,
        func.count(Interview.id).label("candidate_count")
    ).outerjoin(Interview, Job.id == Interview.job_id)

    if current_user and current_user.role == Role.BUSINESS:
        query = query.filter(Job.recruiter_id == current_user.id)

    results = query.group_by(Job.id).offset(skip).limit(limit).all()

    # Map results to Job schema with candidate_count
    jobs_with_count = []
    for job, count in results:
        # Create a dict from job object and add candidate_count
        job_data = job.__dict__
        job_data["candidate_count"] = count
        jobs_with_count.append(job_data)

    return jobs_with_count


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


@router.get("/{job_id}/candidates", response_model=List[job_schema.JobCandidate])
def get_job_candidates(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowBusiness)
):
    """
    Lấy danh sách ứng viên của một Job.
    Chỉ Recruiter tạo ra Job này mới được xem.
    """
    # 1. Check Job existence
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 2. Check permission
    if job.recruiter_id != current_user.id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to view candidates for this job")

    # 3. Query Interviews
    # Join with User to get candidate info
    results = db.query(Interview, User).join(User, Interview.candidate_id == User.id).filter(Interview.job_id == job_id).all()

    candidates_data = []
    for interview, candidate in results:
        candidates_data.append({
            "interview_id": interview.id,
            "candidate_name": candidate.full_name,
            "candidate_email": candidate.email,
            "status": interview.status,
            "total_score": interview.total_score,
            "created_at": interview.created_at
        })

    return candidates_data


@router.put("/{job_id}", response_model=job_schema.Job)
def update_job(
    job_id: int,
    job_in: job_schema.JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowBusiness)
):
    """
    Update a job.
    Only the recruiter who created the job can update it.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.recruiter_id != current_user.id and current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this job")

    update_data = job_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # 1. Tìm Job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 2. FIX LỖI PERMISSION: Cho phép cả 'admin' và chủ sở hữu ('business') xóa
    # Nếu không phải Admin VÀ không phải là người tạo ra job đó -> Chặn
    if current_user.role != 'admin' and job.recruiter_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Bạn không có quyền xóa tin tuyển dụng này."
        )

    # 3. FIX LỖI INTEGRITY (Quan trọng): Xóa con trước rồi mới xóa cha
    # Xóa tất cả các buổi phỏng vấn liên quan đến Job này trước
    # (Để tránh việc DB cố set job_id = null gây lỗi NotNullViolation)
    db.query(Interview).filter(Interview.job_id == job_id).delete(synchronize_session=False)

    # Sau khi dọn sạch con cái, giờ mới xóa Job
    db.delete(job)
    db.commit()
    
    return None