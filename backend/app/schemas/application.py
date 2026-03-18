from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.db.models import ApplicationStatus
class ApplicationBase(BaseModel):
    job_id: int
class ApplicationCreate(ApplicationBase):
    pass
class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
class Application(ApplicationBase):
    id: int
    candidate_id: int
    status: ApplicationStatus
    match_score: Optional[float] = None
    strengths: Optional[List[Dict[str, Any]]] = None
    weaknesses: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    class Config:
        from_attributes = True
class ApplicationCandidateView(Application):
    candidate_name: str
    candidate_email: str
    cv_url: Optional[str] = None
    job_title: str