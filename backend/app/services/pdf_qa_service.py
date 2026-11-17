import io
import uuid
import time
from typing import Dict, Any, List, Optional
from rank_bm25 import BM25Okapi
from pypdf import PdfReader
from app.services.ai_service import ai_service
from app.utils.responses import SmartLensException, AI_DISCLAIMER

# In-memory session cache: session_id -> { user_id, chunks, page_map, bm25, created_at, filename }
pdf_sessions: Dict[str, Dict[str, Any]] = {}

def clean_expired_sessions(max_age_seconds: int = 3600):
    now = time.time()
    expired = [sid for sid, data in pdf_sessions.items() if now - data.get("created_at", now) > max_age_seconds]
    for sid in expired:
        pdf_sessions.pop(sid, None)

def create_pdf_qa_session(file_bytes: bytes, filename: str, user_id: int) -> Dict[str, Any]:
    clean_expired_sessions()
    try:
        stream = io.BytesIO(file_bytes)
        reader = PdfReader(stream)
        page_count = len(reader.pages)
        if page_count == 0:
            raise SmartLensException(400, "The PDF file contains no pages.")

        chunks: List[str] = []
        page_map: List[int] = []
        total_words = 0

        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if not text:
                continue
            page_num = page_idx + 1
            words = text.split()
            total_words += len(words)

            # Chunk page into ~350-word blocks
            chunk_size = 350
            for i in range(0, len(words), chunk_size):
                chunk_slice = " ".join(words[i:i + chunk_size])
                chunks.append(chunk_slice)
                page_map.append(page_num)

        if not chunks:
            raise SmartLensException(
                400,
                "No readable text could be extracted from this PDF. It may be scanned or empty."
            )

        # Build BM25 index
        tokenized_corpus = [chunk.lower().split() for chunk in chunks]
        bm25 = BM25Okapi(tokenized_corpus)

        session_id = str(uuid.uuid4())
        pdf_sessions[session_id] = {
            "user_id": user_id,
            "filename": filename,
            "page_count": page_count,
            "word_count": total_words,
            "chunks": chunks,
            "page_map": page_map,
            "bm25": bm25,
            "created_at": time.time(),
        }

        return {
            "session_id": session_id,
            "filename": filename,
            "page_count": page_count,
            "word_count": total_words,
        }

    except SmartLensException:
        raise
    except Exception as e:
        raise SmartLensException(400, f"Error processing PDF for Q&A: {str(e)}")

async def answer_pdf_question(session_id: str, question: str, user_id: int) -> Dict[str, Any]:
    session = pdf_sessions.get(session_id)
    if not session:
        raise SmartLensException(404, "PDF Q&A session has expired or does not exist. Please upload the PDF again.")

    if session["user_id"] != user_id:
        raise SmartLensException(403, "Access denied to this document session.")

    clean_question = question.strip()
    if not clean_question:
        raise SmartLensException(400, "Question cannot be empty.")

    # BM25 Top-3 chunk retrieval
    bm25 = session["bm25"]
    chunks = session["chunks"]
    page_map = session["page_map"]

    tokenized_query = clean_question.lower().split()
    top_chunks = bm25.get_top_n(tokenized_query, chunks, n=3)

    cited_pages = set()
    context_blocks = []
    for chunk in top_chunks:
        try:
            idx = chunks.index(chunk)
            p_num = page_map[idx]
            cited_pages.add(p_num)
            context_blocks.append(f"[Page {p_num}]\n{chunk}")
        except ValueError:
            context_blocks.append(chunk)

    context_text = "\n\n---\n\n".join(context_blocks)

    prompt = f"""
You are a factual document question-answering assistant.
Answer the user's question STRICTLY and ONLY using the provided document excerpts below.

CRITICAL RULES:
1. If the answer is not contained in the provided excerpts, you MUST reply EXACTLY:
   "This information is not available in the provided document."
2. Cite the exact page number(s) (e.g., "[Page 2]") where the information is found.
3. Never invent, assume, or bring in outside information.

Document Excerpts:
{context_text}

Question:
{clean_question}

Answer:
"""
    answer_text = await ai_service.generate(prompt, temperature=0.1)

    return {
        "question": clean_question,
        "answer": answer_text.strip(),
        "cited_pages": sorted(list(cited_pages)),
        "session_id": session_id,
        "ai_disclaimer": AI_DISCLAIMER
    }

def delete_pdf_qa_session(session_id: str, user_id: int) -> bool:
    session = pdf_sessions.get(session_id)
    if session and session["user_id"] == user_id:
        pdf_sessions.pop(session_id, None)
        return True
    return False
