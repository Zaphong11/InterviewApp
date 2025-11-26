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

class QuestionCandidate(BaseModel):
    question_text: str
    user_answer: Optional[str] = None
    # Exclude criteria and ai_grade for candidate view initially or maybe just criteria

class InterviewContent(BaseModel):
    questions: List[Question]

class InterviewContentCandidate(BaseModel):
    questions: List[QuestionCandidate]

class SubmitAnswerRequest(BaseModel):
    question_id: int # Index of the question in the list
    answer_text: str

class SubmitAnswerResponse(BaseModel):
    status: str

class FinishInterviewResponse(BaseModel):
    total_score: float
    message: str
    summary: str

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

class InterviewCandidateView(BaseModel):
    id: int
    job_id: int
    status: InterviewStatus
    content: InterviewContentCandidate
    
    class Config:
        from_attributes = True
