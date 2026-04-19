from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.db.models import Industry, User, Role
from app.schemas import industry as industry_schema
from app.api import deps

router = APIRouter()

@router.post("/", response_model=industry_schema.IndustryResponse)
def create_industry(
    industry_in: industry_schema.IndustryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Create a new industry.
    Only ADMIN can create.
    """
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if exists
    existing = db.query(Industry).filter(Industry.slug == industry_in.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Industry with this slug already exists")
        
    industry = Industry(**industry_in.dict())
    db.add(industry)
    db.commit()
    db.refresh(industry)
    return industry

@router.get("/", response_model=List[industry_schema.IndustryResponse])
def read_industries(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retrieve all industries. Public access.
    """
    industries = db.query(Industry).offset(skip).limit(limit).all()
    return industries

@router.put("/{industry_id}", response_model=industry_schema.IndustryResponse)
def update_industry(
    industry_id: int,
    industry_in: industry_schema.IndustryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Update an industry. Only ADMIN can update.
    """
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    industry = db.query(Industry).filter(Industry.id == industry_id).first()
    if not industry:
        raise HTTPException(status_code=404, detail="Industry not found")
        
    update_data = industry_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(industry, field, value)
        
    db.commit()
    db.refresh(industry)
    return industry

@router.delete("/{industry_id}")
def delete_industry(
    industry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Delete an industry. Only ADMIN can delete.
    """
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    industry = db.query(Industry).filter(Industry.id == industry_id).first()
    if not industry:
        raise HTTPException(status_code=404, detail="Industry not found")
        
    # Check if there are jobs using this industry
    from app.db.models import Job
    jobs = db.query(Job).filter(Job.industry_id == industry_id).count()
    if jobs > 0:
        raise HTTPException(status_code=400, detail="Cannot delete industry that is being used by jobs")
        
    db.delete(industry)
    db.commit()
    return {"message": "Industry deleted successfully"}
