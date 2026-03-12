import os
import fitz  # PyMuPDF
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import Application
from pydantic import BaseModel, Field
from typing import List
from langchain_core.prompts import PromptTemplate
from app.utils.llm_factory import get_llm
from app.core.config import settings
from fastapi.logger import logger

class CVReviewResult(BaseModel):
    match_score: int = Field(description="Điểm phù hợp từ 0 đến 100")
    is_potential: bool = Field(description="True nếu match_score >= 70, ngược lại False")
    matched_skills: List[str] = Field(description="Danh sách các kỹ năng của ứng viên phù hợp với JD")
    missing_skills: List[str] = Field(description="Danh sách các kỹ năng quan trọng trong JD mà ứng viên còn thiếu")
    short_summary: str = Field(description="Nhận xét ngắn gọn về ứng viên (tối đa 3 câu)")

# Using configured LLM via Factory
llm = get_llm(model_name="qwen3.5:4b", temperature=0.2)

structured_llm = llm.with_structured_output(CVReviewResult)

def extract_text_from_pdf(file_path: str) -> str:
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"CV file not found: {file_path}")
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return ""

def analyze_cv_with_ai(application_id: int):
    # Dùng session local cho background task vì nó chạy ngoài luồng request chính
    db: Session = SessionLocal()
    try:
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            logger.warning(f"Application {application_id} not found.")
            return

        job = application.job
        
        # Xây dựng absolute path dựa trên UPLOAD_DIR
        # UPLOAD_DIR là src/backend/uploads/cvs, cv_url có dạng /static/cvs/uuid.pdf
        if not application.cv_url:
            logger.warning(f"Application {application_id} has no CV URL.")
            return
            
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        # File URL /static/cvs/... -> path uploads/cvs/...
        relative_path = application.cv_url.replace("/static/", "")
        cv_path = os.path.join(base_dir, "uploads", relative_path)
        
        cv_text = extract_text_from_pdf(cv_path)
        
        if not cv_text.strip():
            logger.error(f"CV is empty or unreadable for Application {application_id}")
            application.status = 'REVIEWED'
            application.short_summary = "Không thể đọc nội dung CV để phân tích."
            db.commit()
            return
            
        jd_text = f"Title: {job.title}\nDescription: {job.description}\nRequirements: {job.requirements}"

        prompt = PromptTemplate.from_template(
            "Bạn là một AI Tech Recruiter khó tính. Hãy đối chiếu CV của ứng viên với Job Description (JD). "
            "Đánh giá công tâm, nghiêm ngặt và trả về kết quả JSON chính xác theo cấu trúc yêu cầu.\n\n"
            "Job Description:\n{jd}\n\n"
            "Candidate CV:\n{cv}"
        )
        
        chain = prompt | structured_llm
        
        result: CVReviewResult = chain.invoke({"jd": jd_text, "cv": cv_text})
        
        application.match_score = result.match_score
        application.is_potential = result.is_potential
        application.matched_skills = result.matched_skills
        application.missing_skills = result.missing_skills
        application.short_summary = result.short_summary
        application.status = 'REVIEWED'
        
        db.commit()
        logger.info(f"Successfully analyzed CV for Application {application_id}")
    except Exception as e:
        logger.error(f"Error analyzing CV for application {application_id}: {str(e)}")
    finally:
        db.close()
