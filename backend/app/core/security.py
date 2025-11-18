# app/core/security.py (ĐÃ SỬA ĐỔI DÙNG THƯ VIỆN BCRYPT TRỰC TIẾP)

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import bcrypt # <-- Sử dụng bcrypt trực tiếp

from app.core.config import settings
from app.schemas.user import TokenData
from app.db.models import User
from app.db.session import get_db

# Cấu hình OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# --- Mật khẩu (Dùng Bcrypt trực tiếp) ---

def get_password_hash(password: str) -> str:
    """Tạo hash mật khẩu. Mật khẩu đầu vào được mã hóa thành bytes, sau đó băm."""
    # Mật khẩu phải được mã hóa thành bytes trước khi băm
    password_bytes = password.encode('utf-8')
    
    # Bcrypt tự xử lý việc băm và thêm salt.
    # .decode('utf-8') để chuyển kết quả hash thành chuỗi string lưu vào DB
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xác minh mật khẩu."""
    # Mật khẩu phải được mã hóa thành bytes để so sánh
    plain_password_bytes = plain_password.encode('utf-8')
    # Hash từ DB cũng cần được mã hóa lại thành bytes (vì ta đã lưu nó dưới dạng string)
    hashed_password_bytes = hashed_password.encode('utf-8')
    
    # Bcrypt tự xử lý việc so sánh hash
    return bcrypt.checkpw(plain_password_bytes, hashed_password_bytes)

# --- JWT (Giữ nguyên) ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    # ... (giữ nguyên code JWT như trước)
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "sub": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# --- Dependency: Lấy User hiện tại (Giữ nguyên) ---

# ... (Giữ nguyên hàm get_current_user như trước)
def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("email")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Tài khoản đã bị vô hiệu hóa")
        
    return user