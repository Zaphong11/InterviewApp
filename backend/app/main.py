# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.endpoints import auth, jobs, interviews, tts, admin, users, industries
from app.db.models import Base
from app.db.session import engine
from app.db.models import User
import os

# Tùy chọn: Khởi tạo bảng nếu không dùng Alembic (Không khuyến khích cho Production)
# Base.metadata.create_all(bind=engine) 

app = FastAPI(
    title="FastAPI Auth & Role Management",
    description="API Đăng nhập, Đăng ký và Phân quyền",
    version="1.0.0"
)

# --- CẤU HÌNH CORS ---
# Thêm middleware để cho phép frontend (chạy ở port 3000) gọi API
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Cho phép tất cả các method (GET, POST, etc.)
    allow_headers=["*"], # Cho phép tất cả các header
)

# Mount Static Files
# Ensure uploads directory exists
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "cvs"), exist_ok=True)

app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

# Thêm Router cho Authentication
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])
app.include_router(interviews.router, prefix="/api/v1/interviews", tags=["Interviews"])
app.include_router(tts.router, prefix="/api/v1/tts", tags=["TTS"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(industries.router, prefix="/api/v1/industries", tags=["Industries"])

# --- Ví dụ về Endpoint được bảo vệ bằng Phân quyền ---
from fastapi import Depends, APIRouter
from app.api.deps import AllowAdmin, AllowBusiness, AllowCandidate

protected_router = APIRouter()

@protected_router.get("/admin-only")
def admin_route(current_user: User = Depends(AllowAdmin)):
    """Chỉ Admin mới có thể truy cập."""
    return {"message": "Chào mừng Admin!", "user": current_user.email, "role": current_user.role.value}

@protected_router.get("/business-only")
def business_route(current_user: User = Depends(AllowBusiness)):
    """Chỉ Business mới có thể truy cập."""
    return {"message": "Chào mừng Business!", "user": current_user.email, "company": current_user.company_name}

@protected_router.get("/candidate-only")
def candidate_route(current_user: User = Depends(AllowCandidate)):
    """Chỉ Candidate mới có thể truy cập."""
    return {"message": "Chào mừng Candidate!", "user": current_user.email}

app.include_router(protected_router, prefix="/api/v1/protected", tags=["Protected Examples"])
# --------------------------------------------------------