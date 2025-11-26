import edge_tts
from fastapi import APIRouter, Response
from pydantic import BaseModel

router = APIRouter()

class TTSRequest(BaseModel):
    text: str

@router.post("/speak")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using edge-tts.
    Returns audio/mpeg stream.
    """
    # Sử dụng giọng NamMinhNeural (Nam) hoặc HoaiMyNeural (Nữ)
    voice = "vi-VN-HoaiMyNeural"
    communicate = edge_tts.Communicate(request.text, voice)

    # Lưu vào RAM hoặc file tạm rồi trả về bytes
    # Cách đơn giản nhất để stream bytes:
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
            
    return Response(content=audio_data, media_type="audio/mpeg")
