import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_llm(model_name: str = "qwen3.5:4b", temperature: float = 0.7):
    """
    Factory function to instantiate the correct Langchain LLM based on the model_name.
    Gracefully falls back to Gemini if the requested model's API key is missing.
    If USE_LOCAL_OLLAMA is True, forces the use of local Ollama model.
    """
    if settings.USE_LOCAL_OLLAMA or "qwen" in model_name.lower():
        # Override to ensure Qwen works if requested directly
        actual_model = settings.OLLAMA_MODEL if settings.USE_LOCAL_OLLAMA else model_name
        logger.info(f"Routing request to local Ollama ({actual_model}).")
        return ChatOpenAI(
            model=actual_model,
            api_key="ollama", # Required but ignored
            base_url=settings.OLLAMA_BASE_URL,
            temperature=temperature,
            max_tokens=2048 # Thêm max_tokens mặc định
        )

    model_name_lower = model_name.lower()
    
    # 1. Provide OpenAI (GPT) models
    if "gpt" in model_name_lower:
        if settings.OPENAI_API_KEY:
            return ChatOpenAI(
                model=model_name,
                api_key=settings.OPENAI_API_KEY,
                temperature=temperature
            )
        else:
            logger.warning(f"Requested {model_name} but OPENAI_API_KEY is missing. Falling back to Gemini.")
            
    # 2. Provide Anthropic (Claude) models
    elif "claude" in model_name_lower:
        if settings.ANTHROPIC_API_KEY:
            return ChatAnthropic(
                model_name=model_name,
                api_key=settings.ANTHROPIC_API_KEY,
                temperature=temperature
            )
        else:
            logger.warning(f"Requested {model_name} but ANTHROPIC_API_KEY is missing. Falling back to Gemini.")
            
    # 3. Default to Google (Gemini)
    if not settings.GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is not configured. The AI system cannot function.")
        
    # If falling back due to missing key, force it to use a gemini model name instead of 'gpt-4' etc.
    if "gpt" in model_name_lower or "claude" in model_name_lower:
        actual_model_name = "qwen3.5:4b"
    else:
        actual_model_name = model_name
        
    # Thêm fallback: nếu tên model vẫn chưa khớp fallback, và không có key gemini
    # Nhưng qwen3.5 dùng Ollama nên ở trên đã lo rồi.
    
    return ChatGoogleGenerativeAI(
        model=actual_model_name,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=temperature
    )
