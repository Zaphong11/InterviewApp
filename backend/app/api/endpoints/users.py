from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.db.models import User
from app.schemas.user import UserBase
import shutil
import os
import uuid

router = APIRouter()

@router.post("/upload-cv", response_model=UserBase)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Upload CV (PDF) cho user hiện tại.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file PDF")

    # Create unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = f"uploads/cvs/{unique_filename}"
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Generate URL
    # Assuming the app is served at root, static files are at /static
    cv_url = f"/static/cvs/{unique_filename}"
    
    # Update User
    current_user.cv_url = cv_url
    db.commit()
    db.refresh(current_user)
    
    return current_user
