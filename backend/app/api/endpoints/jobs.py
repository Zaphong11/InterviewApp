from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.db.session import get_db
from app.db.models import Job, User, Role, Interview
from app.services.pdf_service import parse_interview_pdf
from app.api.deps import get_current_user
from typing import Any, List, Optional
from app.schemas import job as job_schema
from app.api import deps

router = APIRouter()


@router.post("/", response_model=job_schema.Job)
def create_job(
        job_in: job_schema.JobCreate,  # Changed from JobUpdate to JobCreate for strict creation validation
        db: Session = Depends(get_db),
        current_user: User = Depends(deps.AllowBusiness)
):
    """
    Tạo Job mới.
    Chỉ Business mới được tạo.
    """
    # 1. Validate Industry
    # Assuming industry_id is passed in job_in
    if hasattr(job_in, 'industry_id') and job_in.industry_id:
        # Note: job_in.industry_id should exist based on new schema
        from app.db.models import Industry
        industry = db.query(Industry).filter(Industry.id == job_in.industry_id).first()
        if not industry:
            raise HTTPException(status_code=400, detail="Industry not found")
    # 2. Validate Job Type (Strict check: REMOTE, PART_TIME, FULL_TIME only?)
    # User said "Allow list... Only accept 3 values".
    # Assuming the Schema Enum has more but we only allow these 3 at POST:
    allowed_types = {"REMOTE", "PART_TIME", "FULL_TIME"}
    if job_in.job_type:
        for jt in job_in.job_type:
            if jt.value not in allowed_types:
                raise HTTPException(status_code=400, detail=f"Invalid job type: {jt}. Allowed: {allowed_types}")
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
        limit: int = 100,
        q: Optional[str] = None,
        job_type: Optional[List[job_schema.JobType]] = Query(None),
        industry: Optional[str] = None,
        min_salary: Optional[int] = Query(None, alias="min_salary"),
        location: Optional[str] = None,
):
    """
    Retrieve jobs with filtering.
    """
    query = db.query(
        Job,
        func.count(Interview.id).label("candidate_count")
    ).outerjoin(Interview, Job.id == Interview.job_id)
    if current_user and current_user.role == Role.BUSINESS:
        query = query.filter(Job.recruiter_id == current_user.id)
    # Dynamic Filtering
    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Job.title.ilike(search),
                Job.description.ilike(search)
            )
        )

    if job_type:
        # Check if job's job_type array overlaps with the filtered types
        query = query.filter(Job.job_type.overlap(job_type))

    if industry:
        try:
            ind_id = int(industry)
            query = query.filter(Job.industry_id == ind_id)
        except ValueError:
            pass  # Invalid ID format, ignore filter

    if min_salary:
        # Filter jobs where max_salary >= min_salary (if exists) or salary_min >= min_salary
        # Simplest logic: Check if provided salary range overlaps or meets expectation.
        # Let's assume user wants jobs that pay AT LEAST min_salary eventually.
        # So we check if salary_max (potential) >= min_salary.
        # If salary_max is NULL (agreement), we might include or exclude based on policy.
        # Here: we filter if salary_min >= min_salary requested.
        query = query.filter(Job.salary_min >= min_salary)

    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
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
    # 3. Query Applications
    from app.db.models import Application, Interview
    results = db.query(Application, User, Interview).join(
        User, Application.candidate_id == User.id
    ).outerjoin(
        Interview, (Interview.job_id == Application.job_id) & (Interview.candidate_id == Application.candidate_id)
    ).filter(Application.job_id == job_id).all()
    candidates_data = []
    for application, candidate, interview in results:
        candidates_data.append({
            "application_id": application.id,
            "interview_id": interview.id if interview else None,
            "candidate_name": candidate.full_name,
            "candidate_email": candidate.email,
            "status": application.status.value,
            "match_score": application.match_score,
            "score_breakdown": application.score_breakdown,
            "strengths": application.strengths,
            "weaknesses": application.weaknesses,
            "total_score": interview.total_score if interview else None,
            "created_at": application.created_at,
            "cv_url": candidate.cv_url
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