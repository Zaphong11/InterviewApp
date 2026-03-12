from typing import Optional, List
import enum
from pydantic import BaseModel, Field
from datetime import datetime
from pydantic.config import ConfigDict
from .industry import IndustryResponse
from .job_category import JobCategoryResponse
from .company import Company
from .campaign import CampaignResponse

# ... Enums are same ...
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

class JobBase(BaseModel):
    title: str
    description: str
    requirements: str
    questions_template: Optional[list] = None
    
    # New Fields
    job_type: Optional[List[JobType]] = None # Changed to List
    industry_id: Optional[int] = Field(default=None, description="ID của ngành nghề (old)") # Optional in Base
    category_id: Optional[int] = Field(default=None, description="ID của loại công việc mới") # Job Category
    salary_min: int # Required
    salary_max: Optional[int] = None
    currency: Optional[str] = "VND"
    location: str # Required
    experience_level: Optional[ExperienceLevel] = None

class JobCreate(JobBase):
    industry_id: int = Field(..., description="ID của ngành nghề") # Required for Create

class JobUpdate(JobBase):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    questions_template: Optional[list] = None
    category_id: Optional[int] = None

class Job(JobBase):
    id: int
    recruiter_id: int
    created_at: datetime
    candidate_count: int = 0
    
    # Include industry details if needed, or just ID. 
    # Usually frontend wants the name.
    # We can add an optional field or rely on recursion if standard implies it.
    # Let's add explicit industry field.
    industry: Optional[IndustryResponse] = None # Using alias "industry_rel" in DB but mapping here might strictly follow DB attribute unless we use specific mapping.
    # If DB relationship is `industry_rel`, we might need `Field(alias='industry_rel')` OR just rename at API level.
    # To keep it simple, let's assume usage of ORM mode handles `industry_rel` if we name it so, or we map it manually.
    # Actually, simpler: define generic response that matches DB, OR define custom.
    # Let's try to stick to `industry` if possible.
    # In models.py: `industry_rel = relationship(...)`.
    # Pydantic `from_attributes=True` will look for `industry` attribute on model. Model has `industry_rel`.
    # So we should call this `industry_rel` OR use `Field(validation_alias='industry_rel')`. 
    # Pydantic v2 uses `validation_alias` or just `alias` depending on config.
    # Let's use `industry_rel` to be safe for now, or rename in model (renaming in model is risky for Alembic if we change col name, but relationship name is Python only).
    # I'll use `industry` with alias.
    industry: Optional[IndustryResponse] = Field(default=None, validation_alias="industry_rel")
    category: Optional[JobCategoryResponse] = None
    company: Optional[Company] = None
    campaign: Optional[CampaignResponse] = None

    model_config = ConfigDict(from_attributes=True)


class JobCandidate(BaseModel):
    interview_id: int
    candidate_name: str
    candidate_email: str
    status: str
    total_score: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class JobAdminResponse(BaseModel):
    id: int
    title: str
    recruiter_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
