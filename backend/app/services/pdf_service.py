import os
from typing import Dict, List
from io import BytesIO
import pypdf
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field

# Define Pydantic models for extraction
class Criteria(BaseModel):
    keyword: str = Field(description="Keyword to look for in the answer")
    score: float = Field(description="Score awarded for this keyword")

class Question(BaseModel):
    question_text: str = Field(description="The text of the interview question")
    criteria: List[Criteria] = Field(description="List of grading criteria for this question")

class ExtractionResult(BaseModel):
    questions: List[Question] = Field(description="List of extracted interview questions")

def parse_interview_pdf(file_content: bytes) -> Dict:
    """
    Parses a PDF file content and extracts interview questions and criteria using Google Gemini.
    """
    # 1. Extract text from PDF
    pdf_reader = pypdf.PdfReader(BytesIO(file_content))
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"

    # 2. Setup LangChain with Gemini
    from app.core.config import settings
    api_key = settings.GOOGLE_API_KEY
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not set in environment variables")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        temperature=0
    )

    # 3. Define Prompt and Parser
    parser = JsonOutputParser(pydantic_object=ExtractionResult)
    
    prompt = PromptTemplate(
        template="You are an expert technical recruiter. Extract interview questions and grading criteria from the following text.\n"
                 "{format_instructions}\n\n"
                 "Text content:\n{text}\n",
        input_variables=["text"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    chain = prompt | llm | parser

    # 4. Execute Chain
    try:
        result = chain.invoke({"text": text})
        return result
    except Exception as e:
        print(f"Error extracting data from PDF: {e}")
        raise e
