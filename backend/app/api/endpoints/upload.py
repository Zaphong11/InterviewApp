import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.db.models import User
from app.api.deps import get_current_user
from typing import Dict

router = APIRouter()

# Tái sử dụng UPLOAD_DIR từ cấu hình chung hoặc định nghĩa lại nếu cần
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
CVS_DIR = os.path.join(UPLOAD_DIR, "cvs")
IMAGES_DIR = os.path.join(UPLOAD_DIR, "images")

os.makedirs(CVS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

@router.post("/cv", response_model=Dict[str, str])
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload CV file (PDF/DOCX). Returns the file URL.
    """
    if not file.content_type in ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Only PDF or Word documents are allowed for CVs.")
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(CVS_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Assuming frontend mounts "/static" to UPLOAD_DIR
    file_url = f"/static/cvs/{filename}"
    return {"url": file_url}

@router.post("/image", response_model=Dict[str, str])
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an image (e.g. company logo). Returns the file URL.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(IMAGES_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_url = f"/static/images/{filename}"
    return {"url": file_url}
