from pydantic import BaseModel
from typing import Any, Dict, List
from datetime import datetime

class AnalysisOut(BaseModel):
    id: int
    tool: str
    input_name: str
    result: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class AnalysisListResponse(BaseModel):
    items: List[AnalysisOut]
    total: int
    page: int
    limit: int
