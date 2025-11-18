# app/api/endpoints/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.session import get_db
from app.db.models import User
from app.schemas.user import UserCreate, UserLogin, Token, UserBase
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter()

@router.post("/register", response_model=UserBase, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Đăng ký người dùng mới (Candidate hoặc Business).
    """
    # 1. Kiểm tra Email và SĐT đã tồn tại chưa
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được đăng ký.",
        )
    
    # 2. Tạo User mới
    hashed_password = get_password_hash(user_in.password)
    
    db_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        phone_number=user_in.phone_number,
        hashed_password=hashed_password,
        role=user_in.user_type, # Sử dụng giá trị user_type đã xác thực
        company_name=user_in.company_name if user_in.user_type == 'business' else None
    )

    # 3. Lưu vào Database
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=Token)
def login_for_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Đăng nhập bằng email (username) và password, trả về JWT Access Token.
    """
    # 1. Tìm User bằng Email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Tài khoản đã bị vô hiệu hóa")
        
    # 2. Tạo Access Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"email": user.email, "role": user.role.value}, # Thêm role vào token
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}