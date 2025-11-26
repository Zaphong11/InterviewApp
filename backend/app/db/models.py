# app/db/models.py

from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, Float, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
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

    # Relationships
    jobs = relationship("Job", back_populates="recruiter")
    interviews = relationship("Interview", back_populates="candidate", foreign_keys="[Interview.candidate_id]")

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    questions_template = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    recruiter = relationship("User", back_populates="jobs")
    interviews = relationship("Interview", back_populates="job")

class InterviewStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    GRADED = "graded"

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(InterviewStatus), default=InterviewStatus.PENDING, nullable=False)
    total_score = Column(Float, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    content = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    job = relationship("Job", back_populates="interviews")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="interviews")