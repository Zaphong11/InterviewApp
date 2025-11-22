import os
import sys
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(os.getcwd())

from app.services.pdf_service import parse_interview_pdf

# Mock pypdf to avoid needing a real PDF file
def mock_pdf_reader(stream):
    mock_page = MagicMock()
    mock_page.extract_text.return_value = """
    Interview Script for Python Developer
    
    Question 1: Explain the difference between list and tuple.
    Criteria:
    - List is mutable (5 points)
    - Tuple is immutable (5 points)
    
    Question 2: What is a decorator?
    Criteria:
    - Function that takes another function (5 points)
    - Extends behavior without modifying structure (5 points)
    """
    mock_reader = MagicMock()
    mock_reader.pages = [mock_page]
    return mock_reader

def test_service():
    print("Testing parse_interview_pdf...")
    
    # Mock response from Gemini
    mock_llm_response = {
        "questions": [
            {
                "question_text": "Explain the difference between list and tuple.",
                "criteria": [
                    {"keyword": "List is mutable", "points": 5.0},
                    {"keyword": "Tuple is immutable", "points": 5.0}
                ]
            },
            {
                "question_text": "What is a decorator?",
                "criteria": [
                    {"keyword": "Function that takes another function", "points": 5.0},
                    {"keyword": "Extends behavior", "points": 5.0}
                ]
            }
        ]
    }

    # Mock pypdf.PdfReader
    with patch('app.services.pdf_service.pypdf.PdfReader', side_effect=mock_pdf_reader):
        # Mock os.getenv to return a dummy key
        with patch('os.getenv', return_value="dummy_key"):
            # Mock ChatGoogleGenerativeAI to return the mock response
            # We need to mock the chain invocation. 
            # The chain is prompt | llm | parser.
            # It's easier to mock the chain itself or the invoke method of the chain components.
            # However, in the function, the chain is built dynamically.
            # We can mock ChatGoogleGenerativeAI and JsonOutputParser.
            
            # Let's mock the chain execution by mocking the invoke method of the last element or the chain object.
            # Since we can't easily access the chain object created inside the function, we can mock ChatGoogleGenerativeAI.
            # But the chain uses the LLM.
            # A simpler way is to mock `app.services.pdf_service.ChatGoogleGenerativeAI`
            
            with patch('app.services.pdf_service.ChatGoogleGenerativeAI') as MockLLM:
                # Mock the LLM instance
                mock_llm_instance = MockLLM.return_value
                
                with patch('app.services.pdf_service.JsonOutputParser') as MockParser:
                    mock_parser_instance = MockParser.return_value
                    
                    # When 'chain = prompt | llm | parser' is executed:
                    # 1. prompt | llm -> intermediate_mock
                    # 2. intermediate_mock | parser -> calls parser.__ror__(intermediate_mock)
                    
                    # Create a mock for the chain
                    mock_chain = MagicMock()
                    mock_chain.invoke.return_value = mock_llm_response
                    
                    # Configure parser.__ror__ to return our mock_chain
                    mock_parser_instance.__ror__.return_value = mock_chain
                    
                    try:
                        result = parse_interview_pdf(b"dummy pdf content")
                        print("\nExtraction Result:")
                        print(result)
                        
                        # Basic validation
                        if "questions" in result and len(result["questions"]) >= 2:
                            print("\nSUCCESS: Extracted questions successfully (Mocked).")
                        else:
                            print("\nFAILURE: Did not extract expected questions.")
                            
                    except Exception as e:
                        print(f"\nERROR: {e}")
                        import traceback
                        traceback.print_exc()

if __name__ == "__main__":
    test_service()
