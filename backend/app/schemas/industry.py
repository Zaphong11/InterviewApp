from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class IndustryBase(BaseModel):
    name: str
    slug: str

class IndustryCreate(IndustryBase):
    pass

class IndustryResponse(IndustryBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
