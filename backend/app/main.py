# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, jobs
from app.db.models import Base
from app.db.session import engine
from app.db.models import User

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
    "http://localhost:3000", # Địa chỉ của frontend Next.js
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Cho phép tất cả các method (GET, POST, etc.)
    allow_headers=["*"], # Cho phép tất cả các header
)

# Thêm Router cho Authentication
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])

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