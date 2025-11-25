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

class Job(JobBase):
    id: int
    recruiter_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

