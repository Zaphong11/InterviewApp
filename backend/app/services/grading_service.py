from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import JsonOutputParser
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
        template="You are an expert technical interviewer. Grade the candidate's answer based on the following criteria.\n"
                 "Question: {question}\n\n"
                 "Grading Criteria:\n{criteria_text}\n\n"
                 "Candidate's Answer: {user_answer}\n\n"
                 "Instructions:\n"
                 "1. Compare the answer against the keywords in the criteria.\n"
                 "2. Award points based on the 'Score' value if the concept of the keyword is present (exact match not required).\n"
                 "3. Provide a total score (sum of matched criteria scores, max 10 usually but follow criteria sum).\n"
                 "4. Provide brief feedback.\n"
                 "{format_instructions}\n",
        input_variables=["question", "criteria_text", "user_answer"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser

    try:
        result = chain.invoke({
            "question": question,
            "criteria_text": criteria_text,
            "user_answer": user_answer
        })
        return result
    except Exception as e:
        print(f"Error grading answer: {e}")
        # Fallback in case of error
        return {
            "score": 0.0,
            "feedback": "Error during AI grading. Please review manually.",
            "matched_keywords": []
        }
