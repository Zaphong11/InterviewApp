import logging
import json
import base64
import os
from pypdf import PdfReader
from sqlalchemy.orm import Session
from app.db.models import Resume, ResumeStatus, User
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
# Verify API key
if not os.getenv("GOOGLE_API_KEY"):
    logger.error("GOOGLE_API_KEY is missing! Using dummy AI for now or failing.")


class CriteriaFeedback(BaseModel):
    khu_vuc: str = Field(description="Tên tiêu chí, ví dụ 'Thông tin', 'Kinh nghiệm', 'Học vấn', 'Kỹ năng'")
    diem: int = Field(description="Điểm số cho tiêu chí này (từ 0-10)")
    mo_ta: str = Field(description="Mô tả chi tiết những gì làm tốt và thiếu sót trong phần này")
    goi_y: Optional[str] = Field(None, description="Gợi ý cải thiện cụ thể hoặc sửa lỗi sai, nếu có")


class ResumeScoreOutput(BaseModel):
    overall_score: int = Field(description="Tỉ lệ điểm số tổng quát trên thang 100")
    overall_feedback: str = Field(description="Đánh giá tổng quan về CV")
    criteria: List[CriteriaFeedback] = Field(description="Danh sách các tiêu chí đánh giá")


def extract_pdf_raw_text(cv_url: str) -> str:
    """Extract raw text from a PDF file using pypdf"""
    # Assuming cv_url is stored as an absolute path or relative path, mapping to local filesystem.
    # In 'users.py', it's saved as /static/cvs/{filename} mapping to uploads/cvs/{filename}
    try:
        # Resolve to actual file system path
        if cv_url.startswith("/static/cvs/"):
            filename = cv_url.replace("/static/cvs/", "")
            file_path = os.path.join("uploads", "cvs", filename)
        else:
            file_path = cv_url

        logger.info(f"Opening PDF for text extraction at: {file_path}")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at {file_path}")

        text = ""
        with open(file_path, "rb") as file:
            reader = PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"

        if not text.strip():
            logger.warning("PDF extraction yielded empty text. Might be an image-only PDF.")

        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise


def analyze_resume_with_gemini(resume_id: int, db: Session):
    """
    Background worker: Process the resume PDF text and score it generically using Gemini.
    """
    logger.info(f"Starting generic AI CV analysis format for resume_id={resume_id}")

    # 1. Fetch Resume and User
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        logger.error(f"Resume {resume_id} not found in DB")
        return
    # Set status to PROCESSING
    resume.status = ResumeStatus.PROCESSING
    db.commit()
    try:
        candidate = db.query(User).filter(User.id == resume.candidate_id).first()

        # 2. Extract CV text
        cv_text = resume.raw_text
        if not cv_text or len(cv_text.strip()) < 50:
            if candidate and candidate.cv_url:
                logger.info("Raw text is empty or too short. Trying to extract from pdf directly.")
                cv_text = extract_pdf_raw_text(candidate.cv_url)
                resume.raw_text = cv_text
            else:
                raise ValueError("Không có nội dung CV hoặc không thể đọc file PDF.")
        if not cv_text or len(cv_text.strip()) < 50:
            raise ValueError("CV có vẻ như không có text hoặc là file ảnh (ảnh quét).")
        # 3. Prepare AI Prompt
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            temperature=0.2,
            max_retries=2,
        )

        structured_llm = llm.with_structured_output(ResumeScoreOutput)
        prompt_template = PromptTemplate.from_template(
            """Bạn là một chuyên gia Tuyển dụng (Top Tier Technical Recruiter) với hơn 10 năm kinh nghiệm review CV ứng viên IT và các ngành khác. 
            Nhiệm vụ của bạn là đánh giá và chấm điểm CV này một cách tổng quát, chi tiết từng phần khắt khe nhưng mang tính xây dựng.
            Hãy đọc nội dung Text của CV dưới đây và trả về kết quả định dạng JSON.
            Nội dung CV Candidate:
            {cv_text}
            Tiêu chí bạn phải đánh giá là: Thông tin (cá nhân, formating), Kinh nghiệm (rõ ràng, có số liệu không), Kỹ năng (có map với kinh nghiệm không), và Trình bày/Lỗi chính tả (ngữ pháp, từ vựng).
            Bắt buộc trả lời bằng tiếng Việt.
            """
        )
        chain = prompt_template | structured_llm
        logger.info("Calling Gemini API...")
        parsed_output = chain.invoke({"cv_text": cv_text[:15000]})

        # Vector & Domain Extraction
        try:
            from app.services.ai_engine import get_text_embedding, get_domain_prediction
            cv_vector = get_text_embedding(cv_text)
            domain_preds = get_domain_prediction(cv_vector)
            top_domain = list(domain_preds.keys())[0]

            resume.embedding = cv_vector
            resume.core_domain = top_domain
        except Exception as e_vec:
            logger.error(f"Error extracting vector/domain in resume analysis: {e_vec}")

        # 5. Update DB
        resume.score = parsed_output.overall_score
        resume.feedback = parsed_output.dict()  # Convert Pydantic object to JSON format
        resume.status = ResumeStatus.COMPLETED
        db.commit()
        logger.info(f"Successfully processed CV for resume_id={resume_id}. Score: {resume.score}")
    except Exception as e:
        logger.error(f"Failed to analyze cv for resume_id={resume_id}: {str(e)}")
        resume.status = ResumeStatus.FAILED
        resume.feedback = {
            "overall_feedback": f"Đã xảy ra lỗi khi AI phân tích CV: {str(e)}",
            "criteria": []
        }
        db.commit()