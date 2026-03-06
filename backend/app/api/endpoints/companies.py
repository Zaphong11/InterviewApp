from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Company, User, Role
from app.api.deps import get_current_user
from typing import List

from app.schemas import company as company_schema
from app.api import deps

router = APIRouter()

@router.post("/", response_model=company_schema.Company)
def create_company(
    company_in: company_schema.CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.AllowBusiness)
):
    """
    Tạo hoặc cập nhật Company Profile cho Business user hiện tại.
    """
    # Check if company already exists for this user
    company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if company:
        # Update instead
        update_data = company_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(company, field, value)
    else:
        # Create new
        company = Company(
            **company_in.dict(),
            owner_id=current_user.id
        )
        db.add(company)
    
    db.commit()
    db.refresh(company)
    return company

@router.get("/me", response_model=company_schema.Company)
def get_my_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Lấy Company Profile của user hiện tại.
    """
    company = db.query(Company).filter(Company.owner_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return company

@router.get("/{company_id}", response_model=company_schema.Company)
def get_company(
    company_id: int,
    db: Session = Depends(get_db)
):
    """
    Lấy thông tin public của một Company.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
