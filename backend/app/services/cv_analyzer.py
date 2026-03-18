import logging
from sqlalchemy.orm import Session
from app.db.models import Application, Job, User, Resume
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class AIScoreOutput(BaseModel):
    match_score: float = Field(description="Percentage match between CV and Job Description (0 to 100)")
    strengths: List[Dict[str, str]] = Field(description="List of strengths, each with a 'title' and 'description'")
    weaknesses: List[Dict[str, str]] = Field(
        description="List of weaknesses or gaps, each with a 'title' and 'description'")


def analyze_cv_with_gemini(application_id: int, db: Session):
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            return
        job = db.query(Job).filter(Job.id == application.job_id).first()
        candidate = db.query(User).filter(User.id == application.candidate_id).first()

        cv_text = ""
        resume = db.query(Resume).filter(Resume.candidate_id == candidate.id).first()
        if resume and resume.raw_text:
            cv_text = resume.raw_text
        elif candidate.cv_url:
            import os
            import pypdf
            # candidate.cv_url -> /static/cvs/xxx.pdf -> uploads/cvs/xxx.pdf
            file_path = f"uploads/{candidate.cv_url.replace('/static/', '')}"
            try:
                if os.path.exists(file_path):
                    with open(file_path, "rb") as f:
                        pdf_reader = pypdf.PdfReader(f)
                        text = ""
                        for page in pdf_reader.pages:
                            extracted = page.extract_text()
                            if extracted:
                                text += extracted + "\n"
                        cv_text = text
                else:
                    logger.warning(f"CV file not found at local path: {file_path}")
            except Exception as e:
                logger.error(f"Error extracting text from CV file {file_path}: {e}")

        if not cv_text or len(cv_text) < 50:
            logger.warning(f"CV Text too short or missing for application {application_id}")
            # Let's save a failed state instead of leaving it as SCREENING
            application.match_score = 0
            application.strengths = []
            application.weaknesses = [{"title": "Lỗi lấy nội dung CV",
                                       "description": "Hệ thống không thể trích xuất văn bản từ file CV của bạn. Vui lòng sử dụng file PDF có thể copy được text."}]
            db.commit()
            return
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            temperature=0.0
        )

        structured_llm = llm.with_structured_output(AIScoreOutput)

        prompt = PromptTemplate.from_template(
            """Evaluate the candidate CV against the Job Description.
            Job Title: {job_title}
            Job Description: {job_desc}
            Job Requirements: {job_req}

            Candidate CV:
            {cv_text}
            """
        )

        chain = prompt | structured_llm

        result = chain.invoke({
            "job_title": job.title,
            "job_desc": job.description,
            "job_req": job.requirements,
            "cv_text": cv_text[:15000]  # truncate to avoid token limits just in case
        })

        application.match_score = result.match_score

        # Convert List[Dict] to format understandable by JSONB
        # Result strengths/weaknesses are list of dicts. We can just dump them.
        strengths = [s.dict() if hasattr(s, "dict") else s for s in result.strengths]
        weaknesses = [w.dict() if hasattr(w, "dict") else w for w in result.weaknesses]

        application.strengths = strengths
        application.weaknesses = weaknesses

        db.commit()
        logger.info(f"Successfully analyzed CV for Application {application_id}. Score: {result.match_score}")

    except Exception as e:
        logger.error(f"Error in analyze_cv_with_gemini (App ID {application_id}): {e}")