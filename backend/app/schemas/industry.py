from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class IndustryBase(BaseModel):
    name: str
    slug: str
    domain: Optional[str] = None

class IndustryCreate(IndustryBase):
    pass

class IndustryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    domain: Optional[str] = None

class IndustryResponse(IndustryBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
