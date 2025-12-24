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
    
    # Link CV (cho Candidate)
    cv_url = Column(String, nullable=True)

    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role.value}')>"

    # Relationships
    jobs = relationship("Job", back_populates="recruiter")
    interviews = relationship("Interview", back_populates="candidate", foreign_keys="[Interview.candidate_id]")


class JobType(str, enum.Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    REMOTE = "REMOTE"
    HYBRID = "HYBRID"
    CONTRACT = "CONTRACT"

class ExperienceLevel(str, enum.Enum):
    INTERN = "INTERN"
    FRESHER = "FRESHER"
    JUNIOR = "JUNIOR"
    SENIOR = "SENIOR"
    MANAGER = "MANAGER"

# Cập nhật lại Job Model
# Lưu ý: Cần thêm các cột mới vào bảng jobs trong DB nếu bảng đã tồn tại!
from sqlalchemy.dialects.postgresql import JSONB, ARRAY

# ... imports ...

class Industry(Base):
    __tablename__ = "industries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    jobs = relationship("Job", back_populates="industry_rel")

# ... Enums ...

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    industry_id = Column(Integer, ForeignKey("industries.id"), nullable=True) # Changed from String to FK
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    questions_template = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # New Fields
    # job_type = ARRAY of Enums. NOTE: ARRAY(Enum) in SQLAlchemy/PG can be tricky. 
    # Using JSONB is often safer/easier for list of strings if strict DB array isn't needed for indexing.
    # But user asked for "ARRAY or JSON". Let's use ARRAY(String) or ARRAY(Enum). 
    # ARRAY(Enum) requires Type decoration. Let's use ARRAY(String) for simplicity and validation in app, 
    # OR ARRAY(Enum) if we are confident. Let's try ARRAY(Enum(JobType)) but might need explicit type creation.
    # Actually, simplest is ARRAY(String) and validate in Pydantic. 
    # But let's try ARRAY(Enum(JobType)) to be "correct".
    job_type = Column(ARRAY(Enum(JobType)), nullable=True) 
    
    # Old field 'industry' removed.
    
    salary_min = Column(Integer, nullable=False) # Required now
    salary_max = Column(Integer, nullable=True)
    currency = Column(String, default="VND")
    location = Column(String, nullable=False) # Required now
    experience_level = Column(Enum(ExperienceLevel), nullable=True)

    # Relationships
    recruiter = relationship("User", back_populates="jobs")
    industry_rel = relationship("Industry", back_populates="jobs") # Renamed to avoid conflict if 'industry' field existed, but we removed it.
    interviews = relationship("Interview", back_populates="job")

class InterviewStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    GRADED = "graded"

class InterviewDecision(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

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
    
    # Decision column
    decision = Column(String, default="PENDING") # Using String for simplicity to match schemas, or Enum(InterviewDecision)

    # Relationships
    job = relationship("Job", back_populates="interviews")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="interviews")