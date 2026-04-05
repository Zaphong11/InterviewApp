# app/db/models.py
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, Float, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()


class Role(str, enum.Enum):
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
    role = Column(Enum(Role), default=Role.CANDIDATE, nullable=False)
    company_name = Column(String, nullable=True)
    cv_url = Column(String, nullable=True)

    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role.value}')>"

    jobs = relationship("Job", back_populates="recruiter")
    interviews = relationship("Interview", back_populates="candidate", foreign_keys="[Interview.candidate_id]")
    applications = relationship("Application", back_populates="candidate", foreign_keys="[Application.candidate_id]")
    resumes = relationship("Resume", back_populates="candidate", uselist=False)


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


from sqlalchemy.dialects.postgresql import JSONB, ARRAY


class Industry(Base):
    __tablename__ = "industries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    jobs = relationship("Job", back_populates="industry_rel")


class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    industry_id = Column(Integer, ForeignKey("industries.id"), nullable=True)  # Changed from String to FK

    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=False)
    questions_template = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    job_type = Column(ARRAY(Enum(JobType)), nullable=True)
    salary_min = Column(Integer, nullable=False)  # Required now
    salary_max = Column(Integer, nullable=True)
    currency = Column(String, default="VND")
    location = Column(String, nullable=False)  # Required now
    experience_level = Column(Enum(ExperienceLevel), nullable=True)
    interview_duration = Column(Integer, nullable=True)  # Duration in minutes
    recruiter = relationship("User", back_populates="jobs")
    industry_rel = relationship("Industry",
                                back_populates="jobs")  # Renamed to avoid conflict if 'industry' field existed, but we removed it.
    interviews = relationship("Interview", back_populates="job")
    applications = relationship("Application", back_populates="job")


class ApplicationStatus(str, enum.Enum):
    SCREENING = "SCREENING"
    AI_TEST = "AI_TEST"
    INTERVIEW = "INTERVIEW"
    OFFER = "OFFER"
    REJECTED = "REJECTED"


class Application(Base):
    __tablename__ = "applications"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.SCREENING, nullable=False)
    match_score = Column(Float, nullable=True)  # Percentage 0-100
    strengths = Column(JSONB, nullable=True)  # List of strengths
    weaknesses = Column(JSONB, nullable=True)  # List of weaknesses
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    job = relationship("Job", back_populates="applications")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="applications")


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
    decision = Column(String,
                      default="PENDING")  # Using String for simplicity to match schemas, or Enum(InterviewDecision)
    job = relationship("Job", back_populates="interviews")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="interviews")


class ResumeStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Resume(Base):
    __tablename__ = "resumes"
    id = Column(Integer, primary_key=True, index=True)
    raw_text = Column(Text, nullable=False)
    status = Column(Enum(ResumeStatus), default=ResumeStatus.PENDING, nullable=False)
    score = Column(Integer, nullable=True)
    feedback = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    candidate_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    candidate = relationship("User", back_populates="resumes")