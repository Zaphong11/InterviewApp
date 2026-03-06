from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.db.models import ApplicationStage
from app.schemas.user import UserResponse as User

class ApplicationNoteBase(BaseModel):
    content: str

class ApplicationNoteCreate(ApplicationNoteBase):
    pass

class ApplicationNote(ApplicationNoteBase):
    id: int
    application_id: int
    recruiter_id: int
    created_at: datetime
    recruiter: Optional[User] = None

    class Config:
        from_attributes = True

class ApplicationBase(BaseModel):
    cv_url: Optional[str] = None
    target_role: Optional[str] = None
    stage: ApplicationStage = ApplicationStage.SCREENING
    status: str = "ACTIVE"

class ApplicationCreate(ApplicationBase):
    job_id: int

class ApplicationUpdate(BaseModel):
    stage: Optional[ApplicationStage] = None
    status: Optional[str] = None

class ApplicationInDBBase(ApplicationBase):
    id: int
    job_id: int
    candidate_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Application(ApplicationInDBBase):
    candidate: Optional[User] = None
    notes: List[ApplicationNote] = []
