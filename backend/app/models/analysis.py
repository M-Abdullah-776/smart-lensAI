from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.sql import func
import enum
from app.database import Base

class ToolType(str, enum.Enum):
    document = "document"
    youtube = "youtube"
    pdf_qa = "pdf_qa"
    resume = "resume"
    url = "url"

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tool = Column(SAEnum(ToolType), nullable=False, index=True)
    input_name = Column(String(500), nullable=False)
    result_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    is_deleted = Column(Integer, default=0, nullable=False)
