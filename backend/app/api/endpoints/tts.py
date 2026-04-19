from fastapi import APIRouter, Response
from pydantic import BaseModel
import io
import soundfile as sf
from vieneu import Vieneu
import neucodec
import dotenv
import os

dotenv.load_dotenv()

router = APIRouter()

REMOTE_API_BASE = os.getenv("VIENEU_API")
REMOTE_MODEL_ID = "pnnbao-ump/VieNeu-TTS"

tts = Vieneu(
    mode = 'remote',
    api_base = REMOTE_API_BASE,
    model_name = REMOTE_MODEL_ID,
    codec_repo="neuphonic/neucodec-onnx-decoder-int8")
SAMPLE_RATE = 24_000

class TTSRequest(BaseModel):
    text: str

@router.post("/speak")
def text_to_speech(request: TTSRequest):
    try:
        audio_array = tts.infer(text=request.text)
        virtual_file = io.BytesIO()
        sf.write(virtual_file, audio_array,samplerate=SAMPLE_RATE , format="wav")
        return Response(content=virtual_file.getvalue(), media_type="audio/wav")
    except Exception as e:
        print(f"TTS ERROR: {e}")
        return Response(content=b"", status_code=500)

