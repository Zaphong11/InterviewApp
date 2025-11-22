from pydantic import BaseModel
from typing import List, Optional
from app.db.models import InterviewStatus

# --- Content Schemas ---
class Criteria(BaseModel):
    keyword: str
    score: float

class Question(BaseModel):
    question_text: str
    criteria: List[Criteria]
    user_answer: Optional[str] = None
    ai_grade: Optional[float] = None

class InterviewContent(BaseModel):
    questions: List[Question]

# --- Interview Schemas ---
class InterviewBase(BaseModel):
    job_id: int
    candidate_id: int
    content: InterviewContent 

class InterviewCreate(InterviewBase):
    pass

class InterviewUpdate(BaseModel):
    status: Optional[InterviewStatus] = None
    total_score: Optional[float] = None
    ai_feedback: Optional[str] = None
    content: Optional[InterviewContent] = None

class Interview(InterviewBase):
    id: int
    status: InterviewStatus
    total_score: Optional[float] = None
    ai_feedback: Optional[str] = None

    class Config:
        from_attributes = True
