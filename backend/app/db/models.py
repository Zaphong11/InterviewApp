# app/db/models.py

from sqlalchemy import Column, Integer, String, Boolean, Enum
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()

class Role(str, enum.Enum):
    """Định nghĩa các vai trò trong hệ thống."""
    ADMIN = "admin"
    BUSINESS = "business"
    CANDIDATE = "candidate"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone_number = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Thêm trường Role
    role = Column(Enum(Role), default=Role.CANDIDATE, nullable=False)
    
    # Trường bổ sung cho Business (Tên công ty)
    company_name = Column(String, nullable=True) 

    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role.value}')>"

# (Bạn có thể thêm các models khác như Post, Interview, v.v. tại đây)