from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field
from app.core.config import settings

# Define Pydantic models for grading output
class GradingResult(BaseModel):
    score: float = Field(description="The score awarded for the answer, from 0 to 10")
    feedback: str = Field(description="Brief feedback explaining the score")
    matched_keywords: List[str] = Field(description="List of keywords from criteria that were found in the answer")

def grade_answer(question: str, criteria: List[Dict[str, Any]], user_answer: str) -> Dict[str, Any]:
    """
    Grades a user's answer based on the question and criteria using AI.
    """
    if not settings.GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is not set")

    # Initialize LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0
    )

    # Setup Parser
    parser = JsonOutputParser(pydantic_object=GradingResult)

    # Format criteria for prompt
    criteria_list = []
    for c in criteria:
        # Lấy score, nếu không có thì tìm points, nếu không có nữa thì mặc định là 0
        s = c.get('score', c.get('points', 0)) 
        k = c.get('keyword', '')
        criteria_list.append(f"- Keyword: {k} (Score: {s})")
    criteria_text = "\n".join(criteria_list)

    # Define Prompt
    prompt = PromptTemplate(
        template="You are an expert technical interviewer. Grade the candidate's answer based on the following criteria.\n\n"
                 "Input Data:\n"
                 "- Question: {question}\n"
                 "- Grading Criteria: {criteria_text}\n"
                 "- Candidate's Answer: {user_answer}\n\n"
                 "STRICT INSTRUCTIONS:\n"
                 "1. LANGUAGE: The 'feedback' field MUST be in VIETNAMESE (Tiếng Việt), regardless of the input language.\n"
                 "2. GRADING: Compare the answer against the keywords in the criteria.\n"
                 "3. SCORING RULES:\n"
                 "   - Calculate the 'Max Possible Score' by summing all points in the criteria.\n"
                 "   - Award points ONLY if the concept is present.\n"
                 "   - IMPORTANT: The Final Score MUST NOT exceed the 'Max Possible Score'. If the sum is higher, cap it at the max.\n"
                 "   - If the candidate's answer is irrelevant or wrong, score is 0.\n"
                 "4. FEEDBACK STYLE: Constructive, helpful, and concise (2-3 sentences).\n\n"
                 "{format_instructions}\n",
        input_variables=["question", "criteria_text", "user_answer"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser

    result = chain.invoke({
            "question": question,
            "criteria_text": criteria_text,
            "user_answer": user_answer
    })
    max_possible_points = sum([float(c.get('score', c.get('points', 0))) for c in criteria])
    
    # 2. Lấy điểm AI chấm (đề phòng nó trả về string thì ép kiểu)
    try:
        raw_ai_score = float(result.get('score', 0))
    except:
        raw_ai_score = 0.0

    # 3. Kẹp điểm (Clamping): Không bao giờ cho phép vượt quá Max
    final_score = min(raw_ai_score, max_possible_points)
    
    # 4. (Tùy chọn) Logic làm tròn đẹp: 
    # Nếu điểm > 0 và < Max, làm tròn 1 chữ số thập phân
    final_score = round(final_score, 1)

    # 5. Cập nhật lại vào result để trả về
    result['score'] = final_score
    return result

def generate_final_summary(questions: List[Dict[str, Any]]) -> str:
    """
    Generates a final summary of the interview based on all questions and answers.
    """
    if not settings.GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is not set")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.7
    )

    # Construct context from questions
    context_parts = []
    total_score_achieved = 0.0
    total_max_score = 0.0

    for i, q in enumerate(questions):
        q_text = q.get("question_text", "")
        u_answer = q.get("user_answer", "No answer")
        ai_grade = q.get("ai_grade", 0)
        
        # Calculate max score for this question
        criteria = q.get("criteria", [])
        max_score = sum([float(c.get('score', c.get('points', 0))) for c in criteria])
        
        total_score_achieved += ai_grade
        total_max_score += max_score

        context_parts.append(f"Question {i+1}: {q_text}")
        context_parts.append(f"Candidate Answer: {u_answer}")
        context_parts.append(f"Score: {ai_grade}/{max_score}")
        context_parts.append("---")

    context_text = "\n".join(context_parts)
    final_score_str = f"{total_score_achieved}/{total_max_score}"

    prompt = PromptTemplate(
        template="Dựa trên nội dung phỏng vấn dưới đây, hãy viết một đoạn văn đánh giá tổng quan về kiến thức chuyên môn, điểm mạnh và điểm yếu của ứng viên.\n"
                 "Cuối cùng, hãy chốt lại bằng Tổng điểm (ví dụ: Tổng điểm: {final_score_str}).\n"
                 "Giọng văn chuyên nghiệp, mang tính xây dựng, khách quan.\n\n"
                 "Nội dung phỏng vấn:\n"
                 "{context_text}\n",
        input_variables=["context_text", "final_score_str"]
    )

    chain = prompt | llm | StrOutputParser()

    summary = chain.invoke({
        "context_text": context_text,
        "final_score_str": final_score_str
    })

    return summary