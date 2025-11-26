from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from pydantic.config import ConfigDict

class JobBase(BaseModel):
    title: str
    description: str
    requirements: str
    questions_template: Optional[list] = None

class JobCreate(JobBase):
    pass

class JobUpdate(JobBase):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    questions_template: Optional[list] = None

class Job(JobBase):
    id: int
    recruiter_id: int
    created_at: datetime
    candidate_count: int = 0

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
