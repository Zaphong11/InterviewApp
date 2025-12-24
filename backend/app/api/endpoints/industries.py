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
