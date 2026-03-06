from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from pydantic.config import ConfigDict

class JobCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class JobCategoryCreate(JobCategoryBase):
    pass

class JobCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class JobCategoryResponse(JobCategoryBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
