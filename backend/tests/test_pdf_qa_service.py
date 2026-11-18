import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.services.pdf_qa_service import create_pdf_qa_session, answer_pdf_question, delete_pdf_qa_session, pdf_sessions

async def test_pdf_qa_flow():
    # Verify session setup and retrieval logic
    session_id = "test-session-123"
    pdf_sessions[session_id] = {
        "user_id": 1,
        "filename": "smartlens_specs.pdf",
        "page_count": 2,
        "word_count": 120,
        "full_text": """--- [Page 1] ---
SmartLens AI Architecture Specification
Authors: Engineering Team
Platform: FastAPI + React + Tailwind CSS
Primary LLM: Google Gemini Flash

--- [Page 2] ---
Security & Metrics:
Uptime SLA: 99.9%
Encryption: TLS 1.3 in transit, AES-256 at rest
Max Document Size: 10 MB
""",
        "chunks": [],
        "page_map": [],
        "bm25": None,
        "history": [],
        "created_at": 9999999999,
    }

    if settings.AI_API_KEY:
        res = await answer_pdf_question(session_id, "What is the uptime SLA and encryption?", 1)
        assert len(res["answer"]) > 0
        assert 2 in res["cited_pages"]

    delete_pdf_qa_session(session_id, 1)
    assert session_id not in pdf_sessions
    print("=== PDF Q&A LOCAL UNIT TEST PASSED ===")

if __name__ == "__main__":
    asyncio.run(test_pdf_qa_flow())
