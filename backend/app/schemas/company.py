from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

class CompanyBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(CompanyBase):
    name: Optional[str] = None

class CompanyInDBBase(CompanyBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Company(CompanyInDBBase):
    pass
