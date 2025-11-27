# app/api/deps.py

from fastapi import Depends, HTTPException, status
from app.db.models import User, Role
from app.core.security import get_current_user, get_current_user_optional

# --- Hàm kiểm tra Role ---

def check_role(*roles: Role):
    """Dependency Factory để kiểm tra vai trò của người dùng."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền truy cập. Cần một trong các vai trò: {[r.value for r in roles]}",
            )
        return current_user
    return role_checker

# Các Dependencies cụ thể
AllowAdmin = check_role(Role.ADMIN)
AllowBusiness = check_role(Role.BUSINESS)
AllowCandidate = check_role(Role.CANDIDATE)
AllowBusinessOrAdmin = check_role(Role.BUSINESS, Role.ADMIN)