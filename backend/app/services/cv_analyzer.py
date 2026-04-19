import logging
import os
import pypdf
import io
from sqlalchemy.orm import Session
from app.db.models import Application, Job, User, Resume
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from app.services.ai_engine import get_text_embedding, get_domain_prediction, calculate_cosine_similarity

logger = logging.getLogger(__name__)


class AIScoreOutput(BaseModel):
    gemini_match_score: float = Field(description="Điểm phần trăm phù hợp (0-100) do AI đánh giá dựa trên JD và CV.")
    experience_months: int = Field(
        description="Tổng số tháng kinh nghiệm làm việc trích xuất từ CV. Ví dụ 2 năm = 24. Nếu Fresher = 0.")
    gpa_score: float = Field(description="Điểm trung bình (GPA) quy đổi về thang 100. Nếu không có ghi, trả về 0.")
    strengths: List[Dict[str, str]] = Field(description="Danh sách điểm mạnh, gồm 'title' và 'description'")
    weaknesses: List[Dict[str, str]] = Field(
        description="Danh sách điểm yếu hoặc thiếu sót, gồm 'title' và 'description'")

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
            file_path = f"uploads/{candidate.cv_url.replace('/static/', '')}"
            try:
                if os.path.exists(file_path):
                    with open(file_path, "rb") as f:
                        raw_data = f.read()

                        start_idx = raw_data.find(b'%PDF')
                        if start_idx != -1:
                            clean_pdf_data = io.BytesIO(raw_data[start_idx:])
                            pdf_reader = pypdf.PdfReader(clean_pdf_data)
                            cv_text = "".join(
                                [page.extract_text() + "\n" for page in pdf_reader.pages if page.extract_text()])
                        else:
                            logger.error(f"File {file_path} không phải là định dạng PDF hợp lệ.")
            except Exception as e:
                logger.error(f"Error extracting text: {e}")

        if not cv_text or len(cv_text) < 50:
            application.match_score = 0
            application.weaknesses = [{"title": "Lỗi hệ thống", "description": "Không thể trích xuất văn bản từ CV."}]
            db.commit()
            return

        if not resume:
            from app.db.models import ResumeStatus
            resume = Resume(
                candidate_id=candidate.id,
                raw_text=cv_text,
                status=ResumeStatus.COMPLETED
            )
            db.add(resume)
            db.commit()
            db.refresh(resume)

        logger.info("MiniLM & MLP")

        cv_vector = get_text_embedding(cv_text)
        jd_vector = get_text_embedding(job.requirements or job.description)

        vector_match_score = calculate_cosine_similarity(cv_vector, jd_vector)

        domain_preds = get_domain_prediction(cv_vector)
        top_domain = list(domain_preds.keys())[0]
        top_domain_score = list(domain_preds.values())[0]

        if resume:
            resume.embedding = cv_vector
            resume.core_domain = top_domain
            db.commit()

        # Check for domain mismatch
        industry_name = ""
        if job.industry_id:
            from app.db.models import Industry
            industry = db.query(Industry).filter(Industry.id == job.industry_id).first()
            if industry:
                industry_name = industry.domain

        domain_mismatch = False
        if industry_name and top_domain:
            if industry_name.strip().lower() != top_domain.strip().lower() and top_domain_score >= 40.0:
                domain_mismatch = True

        if domain_mismatch:
            logger.warning(f"Domain mismatch! Job is {industry_name}, but CV is {top_domain}. Bypassing Gemini.")
            class DummyResult:
                gemini_match_score = 0.0
                experience_months = 0
                gpa_score = 0.0
                strengths = []
                weaknesses = [
                    {
                        "title": "Trái Ngành (Domain Mismatch)",
                        "description": f"Công việc yêu cầu lĩnh vực '{industry_name}' nhưng sơ yếu lý lịch của bạn chủ yếu hướng về '{top_domain}' (Độ tự tin: {top_domain_score}%). Đã chặn phân tích sâu bằng AI."
                    }
                ]
            result = DummyResult()
        else:
            logger.info("Gemini API")
            llm = ChatGoogleGenerativeAI(
                model="gemini-3-flash-preview",
                temperature=0.0
            )
            structured_llm = llm.with_structured_output(AIScoreOutput)

            prompt = PromptTemplate.from_template(
                """Bạn là Chuyên gia Tuyển dụng. Hãy đọc Job Description và CV dưới đây, sau đó:
                1. Tự chấm điểm phù hợp 'gemini_match_score' (Từ 0 đến 100).
                2. Trích xuất chính xác tổng số tháng kinh nghiệm 'experience_months'.
                3. Trích xuất 'gpa_score' và quy đổi về thang 100.
                4. Chỉ ra Điểm mạnh và Điểm yếu.

                Job Title: {job_title}
                Job Requirements: {job_req}
                Candidate CV: {cv_text}
                """
            )
            chain = prompt | structured_llm
            result = chain.invoke({
                "job_title": job.title,
                "job_desc": job.description,
                "job_req": job.requirements,
                "cv_text": cv_text[:15000]  # truncate to avoid token limits just in case
            })

        logger.info("Final result")
        exp_score = min((result.experience_months / 60) * 100, 100)
        final_score = (result.gemini_match_score * 0.4) + (vector_match_score * 0.4) + (exp_score * 0.1) + (
                    result.gpa_score * 0.1)
        if top_domain_score < 50.0:
            logger.warning(f"Resume not fit: {top_domain} ({top_domain_score}%).")
            final_score = final_score * 0.5

        application.match_score = round(final_score, 1)
        
        application.score_breakdown = {
            "core_domain": top_domain,
            "top_domain_score": round(top_domain_score, 1),
            "gemini_match_score": round(result.gemini_match_score, 1),
            "vector_match_score": round(vector_match_score, 1),
            "exp_score": round(exp_score, 1),
            "gpa_score": round(result.gpa_score, 1)
        }

        if resume:
            resume.experience_months = result.experience_months
            resume.gpa_score = result.gpa_score

        application.strengths = [s.dict() if hasattr(s, "dict") else s for s in result.strengths]
        application.weaknesses = [w.dict() if hasattr(w, "dict") else w for w in result.weaknesses]

        db.commit()

        logger.info(f"App ID {application_id} | match score: {application.match_score}")
        logger.info(
            f"Gemini={result.gemini_match_score}, Vector={vector_match_score:.1f}, Exp={result.experience_months}m, Ngành={top_domain}")

    except Exception as e:
        logger.error(f"Error in analyze_cv_with_gemini (App ID {application_id}): {e}")