# app/db/session.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Tạo engine kết nối với Database
engine = create_engine(settings.DATABASE_URL)

# Cấu hình Session Local để tạo phiên làm việc (session)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency để lấy session database."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()