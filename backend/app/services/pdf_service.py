import os
from typing import Dict, List
from io import BytesIO
import pypdf
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field

# --- Define Pydantic models (Giữ nguyên cấu trúc cũ để không lỗi Frontend) ---
class Criteria(BaseModel):
    keyword: str = Field(description="Từ khóa quan trọng cần có trong câu trả lời")
    score: float = Field(description="Điểm số cho từ khóa này (Thường tổng là 10)")

class Question(BaseModel):
    question_text: str = Field(description="Nội dung câu hỏi phỏng vấn")
    criteria: List[Criteria] = Field(description="Danh sách tiêu chí chấm điểm")

class ExtractionResult(BaseModel):
    questions: List[Question] = Field(description="Danh sách các câu hỏi đã được chọn lọc")

def parse_interview_pdf(file_content: bytes) -> Dict:
    """
    Đọc file PDF, sử dụng Gemini để lọc ra 10 câu hỏi hay nhất và trích xuất dưới dạng JSON.
    """
    # 1. Extract text from PDF
    try:
        pdf_reader = pypdf.PdfReader(BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    except Exception as e:
        raise ValueError(f"Lỗi đọc file PDF: {str(e)}")

    # 2. Setup LangChain with Gemini
    # Lưu ý: Sửa lại model thành 'gemini-1.5-flash' (bản chuẩn hiện tại). 
    # Nếu bạn thực sự có access vào bản 2.5 thì hãy đổi lại.
    from app.core.config import settings
    api_key = settings.GOOGLE_API_KEY
    if not api_key:
        raise ValueError("GOOGLE_API_KEY chưa được cấu hình trong biến môi trường")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        google_api_key=api_key,
        temperature=0.2 # Tăng nhẹ temperature để AI chọn câu hỏi "khôn" hơn
    )

    # 3. Define Prompt and Parser
    parser = JsonOutputParser(pydantic_object=ExtractionResult)
    
    # --- PROMPT ĐÃ ĐƯỢC NÂNG CẤP ---
    prompt_template = """
    You are an Expert Recruitment Consultant capable of analyzing interview materials for ANY Industry (IT, Law, Marketing, Finance, Healthcare, etc.).

    YOUR TASK:
    Analyze the provided document text which may contain a large bank of questions (50-100+).
    
    ACTION REQUIRED:
    1. **Identify the Domain:** Understand the specific field/industry of the document.
    2. **CURATE TOP 10:** Select exactly **10 BEST questions** that are most comprehensive, distinct, and suitable for evaluating a candidate's core competencies.
       - If the document has fewer than 10 questions, extract all of them.
       - Do NOT extract simple/duplicate questions if better ones exist.
    3. **Generate Criteria:** For each selected question, extract the grading criteria/keywords from the text.
       - **IMPORTANT:** If the text ONLY lists questions without answers/criteria, YOU MUST GENERATE logical grading criteria and keywords based on your expert knowledge of that field.
       - Assign a 'score' to each keyword so the total score for one question sums up to roughly 10 points.

    {format_instructions}

    DOCUMENT CONTENT:
    {text}
    """

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["text"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser

    # 4. Execute Chain
    try:
        # Gemini 1.5 Flash có context window 1M token, nên ném 100 trang PDF vào cũng vô tư.
        result = chain.invoke({"text": text})
        return result
    except Exception as e:
        print(f"Error extracting data from PDF with AI: {e}")
        # Fallback hoặc raise lỗi tùy bạn, ở đây raise để Frontend biết
        raise ValueError("Không thể xử lý file PDF này. Vui lòng thử lại.")