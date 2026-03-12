from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class CampaignStageBase(BaseModel):
    stage_order: int
    stage_name: str
    ai_model: str
    pdf_context_url: Optional[str] = None

class CampaignStageCreate(CampaignStageBase):
    pass

class CampaignStageResponse(CampaignStageBase):
    id: int
    campaign_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CampaignBase(BaseModel):
    passing_rule: str

class CampaignCreate(CampaignBase):
    job_id: int

class CampaignResponse(CampaignBase):
    id: int
    job_id: int
    stages: List[CampaignStageResponse] = []
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
