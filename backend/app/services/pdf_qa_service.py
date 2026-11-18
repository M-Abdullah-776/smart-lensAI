import io
import re
import uuid
import time
import logging
from typing import Dict, Any, List, Optional
from rank_bm25 import BM25Okapi
from pypdf import PdfReader
from app.services.ai_service import ai_service
from app.utils.responses import SmartLensException, AI_DISCLAIMER

logger = logging.getLogger("smartlens.pdf_qa")

# In-memory session cache: session_id -> { user_id, filename, page_count, word_count, full_text, chunks, page_map, bm25, history, created_at }
pdf_sessions: Dict[str, Dict[str, Any]] = {}

def clean_expired_sessions(max_age_seconds: int = 7200):
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
        full_annotated_parts: List[str] = []
        total_words = 0

        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if not text:
                continue
            text = text.strip()
            page_num = page_idx + 1
            words = text.split()
            total_words += len(words)

            full_annotated_parts.append(f"--- [Page {page_num}] ---\n{text}")

            # Chunk into ~400-word blocks with 50-word overlap for granular retrieval
            chunk_size = 400
            step = 350
            for i in range(0, len(words), step):
                chunk_slice = " ".join(words[i:i + chunk_size])
                if chunk_slice.strip():
                    chunks.append(f"[Page {page_num}]\n{chunk_slice}")
                    page_map.append(page_num)

        if not full_annotated_parts:
            raise SmartLensException(
                400,
                "No readable text could be extracted from this PDF. It appears to be scanned (image-only) or empty."
            )

        full_annotated_text = "\n\n".join(full_annotated_parts)

        # Build BM25 index for large document retrieval
        bm25 = None
        if chunks:
            tokenized_corpus = [chunk.lower().split() for chunk in chunks]
            bm25 = BM25Okapi(tokenized_corpus)

        session_id = str(uuid.uuid4())
        pdf_sessions[session_id] = {
            "user_id": user_id,
            "filename": filename,
            "page_count": page_count,
            "word_count": total_words,
            "full_text": full_annotated_text,
            "chunks": chunks,
            "page_map": page_map,
            "bm25": bm25,
            "history": [],
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

    full_text = session.get("full_text", "")
    filename = session.get("filename", "document.pdf")
    page_count = session.get("page_count", 1)
    cited_pages = set()

    # Modern Gemini context window: 1M tokens (~3M chars).
    # If document is <= 150,000 characters (~25,000 words / ~50 dense pages),
    # feed 100% of the document to Gemini so no facts, tables, or sections are missed!
    if len(full_text) <= 150000:
        context_text = full_text
    else:
        # Hybrid retrieval for very large documents: top 8 chunks via BM25 + first page overview
        bm25 = session.get("bm25")
        chunks = session.get("chunks", [])
        page_map = session.get("page_map", [])

        top_chunks = bm25.get_top_n(clean_question.lower().split(), chunks, n=8) if bm25 else chunks[:8]
        context_blocks = []
        for chunk in top_chunks:
            try:
                idx = chunks.index(chunk)
                p_num = page_map[idx]
                cited_pages.add(p_num)
            except ValueError:
                pass
            context_blocks.append(chunk)

        # Include first page if not already in context
        if chunks and chunks[0] not in top_chunks:
            context_blocks.insert(0, f"[Overview - Page 1]\n{chunks[0]}")

        context_text = "\n\n---\n\n".join(context_blocks)

    # Multi-turn history support
    history = session.setdefault("history", [])
    history_context = ""
    if history:
        recent = history[-3:]
        history_lines = [f"User: {q}\nSmartLens: {a}" for q, a in recent]
        history_context = "PREVIOUS CONVERSATION IN THIS SESSION:\n" + "\n\n".join(history_lines) + "\n\n"

    prompt = f"""You are SmartLens AI, an expert, precision-grounded document question-answering assistant.
Your goal is to provide a completely accurate, comprehensive, and factual answer to the user's question based strictly on the provided document.

DOCUMENT CONTENT ({filename}, {page_count} Pages):
\"\"\"
{context_text}
\"\"\"

{history_context}USER QUESTION:
{clean_question}

STRICT ANSWERING GUIDELINES:
1. Factual Precision: Answer the question directly and factually using the document content. Extract exact numbers, names, dates, quotes, definitions, and conclusions where relevant. Do not guess or fabricate information.
2. Exact Page Citations: Always cite the exact page number(s) where each fact originates, formatted as `[Page X]` (for example: "The quarterly revenue grew by 28% [Page 2].").
3. Synthesis & Clarity: Format your answer clearly using bullet points, bold key terms, and concise paragraphs so it is easy to read.
4. Transparency: If the document genuinely does not contain the answer, reply: "Based on the provided document, this information is not mentioned." Never bring in outside knowledge or make up facts.

YOUR ANSWER:"""

    answer_text = await ai_service.generate(prompt, temperature=0.1)

    # Extract cited pages from Gemini's response (e.g. [Page 2], Page 2)
    matches = re.findall(r"\[Page\s*(\d+)\]", answer_text, re.IGNORECASE)
    for m in matches:
        try:
            cited_pages.add(int(m))
        except ValueError:
            pass

    if not cited_pages:
        loose_matches = re.findall(r"\bPage\s*(\d+)\b", answer_text, re.IGNORECASE)
        for m in loose_matches:
            try:
                cited_pages.add(int(m))
            except ValueError:
                pass

    # Save turn to history
    history.append((clean_question, answer_text.strip()))

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
