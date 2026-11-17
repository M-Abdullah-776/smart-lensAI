from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime

class UserAdminOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    daily_requests_used: int
    total_analyses: int = 0

    class Config:
        from_attributes = True

class SystemSettingUpdate(BaseModel):
    max_upload_size_mb: Optional[int] = None
    daily_ai_request_limit: Optional[int] = None
    tools_enabled: Optional[Dict[str, bool]] = None

class AnnouncementCreate(BaseModel):
    message: str

class AnnouncementOut(BaseModel):
    id: int
    message: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_analyses: int
    analyses_by_tool: Dict[str, int]
    daily_usage: List[Dict[str, Any]]
