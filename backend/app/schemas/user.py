# app/schemas/user.py

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from app.db.models import Role

# --- Schemas cho AUTH/ACCESS TOKEN ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class TokenData(BaseModel):
    email: Optional[EmailStr] = None

# --- Schemas cho ĐĂNG KÝ (INPUT) ---
class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, description="Họ và tên")
    email: EmailStr = Field(..., description="Địa chỉ email")
    phone_number: str = Field(..., description="Số điện thoại")
    password: str = Field(..., min_length=8, max_length=72, description="Mật khẩu (Tối đa 72 ký tự)")
    re_password: str = Field(..., description="Nhập lại mật khẩu")
    
    # Loại người dùng: 'business' hoặc 'candidate'
    user_type: Role = Field(Role.CANDIDATE, description="Loại tài khoản: business/candidate")
    
    # Tên công ty (Chỉ cần cho 'business')
    company_name: Optional[str] = Field(None, description="Tên công ty (nếu là business)")

    @validator('re_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Mật khẩu nhập lại không khớp.')
        return v
    
    @validator('company_name', always=True)
    def validate_company_name(cls, v, values, **kwargs):
        if values.get('user_type') == Role.BUSINESS and not v:
            raise ValueError('Tên công ty là bắt buộc đối với loại tài khoản Business.')
        return v

# --- Schema cho ĐĂNG NHẬP (INPUT) ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# --- Schema cơ bản cho User (OUTPUT) ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: str
    role: Role
    company_name: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True # Cho phép sử dụng SQLAlchemy models