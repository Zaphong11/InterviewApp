from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.db.models import JobCategory, User
from app.schemas import job_category as category_schema
from app.api import deps

router = APIRouter()

@router.get("/", response_model=List[category_schema.JobCategoryResponse])
def get_job_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách các ngành nghề (Job Categories).
    """
    categories = db.query(JobCategory).offset(skip).limit(limit).all()
    return categories

@router.post("/", response_model=category_schema.JobCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_job_category(
    category_in: category_schema.JobCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowAdmin)
):
    """
    Thêm mới một ngành nghề (Job Category). CHỈ Admin mới có quyền.
    """
    existing_category = db.query(JobCategory).filter(JobCategory.name == category_in.name).first()
    if existing_category:
        raise HTTPException(status_code=400, detail="Job category already exists")
    
    category = JobCategory(**category_in.dict())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.put("/{category_id}", response_model=category_schema.JobCategoryResponse)
def update_job_category(
    category_id: int,
    category_in: category_schema.JobCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowAdmin)
):
    """
    Cập nhật thông tin ngành nghề. CHỈ Admin mới có quyền.
    """
    category = db.query(JobCategory).filter(JobCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Job category not found")
        
    update_data = category_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
        
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowAdmin)
):
    """
    Xóa một ngành nghề. CHỈ Admin mới có quyền.
    Lưu ý: Nếu có database constraint foreign key, việc xóa category sẽ yêu cầu set null category_id ở Job hoặc cascade delete.
    Chỗ này giả sử category có thể xóa nếu không ràng buộc.
    """
    category = db.query(JobCategory).filter(JobCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Job category not found")
        
    db.delete(category)
    db.commit()
    return None
