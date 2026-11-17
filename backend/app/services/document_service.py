import io
import hashlib
import json
from typing import Tuple, List, Dict, Any
from app.services.ai_service import ai_service
from app.utils.responses import SmartLensException, AI_DISCLAIMER

def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, int, int]:
    try:
        from pypdf import PdfReader
        stream = io.BytesIO(file_bytes)
        reader = PdfReader(stream)
        page_count = len(reader.pages)
        if page_count == 0:
            raise SmartLensException(400, "The PDF file has no pages.")

        extracted_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                extracted_text.append(text.strip())

        full_text = "\n\n".join(extracted_text).strip()
        if not full_text:
            raise SmartLensException(
                400,
                "This PDF contains no extractable text. It appears to be scanned or image-only. Please use a text-based document."
            )

        words = full_text.split()
        return full_text, page_count, len(words)
    except SmartLensException:
        raise
    except Exception as e:
        raise SmartLensException(400, f"Failed to read PDF file. The file may be corrupted or password-protected.")

def extract_text_from_docx(file_bytes: bytes) -> Tuple[str, int, int]:
    try:
        import docx
        stream = io.BytesIO(file_bytes)
        doc = docx.Document(stream)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)

        full_text = "\n\n".join(paragraphs).strip()
        if not full_text:
            raise SmartLensException(400, "The DOCX file contains no readable text.")

        words = full_text.split()
        # Page count estimation for DOCX based on ~400 words per page
        page_count = max(1, (len(words) + 399) // 400)
        return full_text, page_count, len(words)
    except SmartLensException:
        raise
    except Exception:
        raise SmartLensException(400, "Failed to read DOCX file. The file may be damaged or in an unsupported format.")

def extract_text_from_txt(file_bytes: bytes) -> Tuple[str, int, int]:
    try:
        try:
            full_text = file_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            full_text = file_bytes.decode("latin-1", errors="replace").strip()

        if not full_text:
            raise SmartLensException(400, "The text file is empty.")

        words = full_text.split()
        page_count = max(1, (len(words) + 499) // 500)
        return full_text, page_count, len(words)
    except SmartLensException:
        raise
    except Exception:
        raise SmartLensException(400, "Failed to decode text file. Please ensure it is saved with standard UTF-8 encoding.")

def chunk_text(text: str, max_chunk_chars: int = 10000) -> List[str]:
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = []
    current_length = 0

    for para in paragraphs:
        if current_length + len(para) > max_chunk_chars and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [para]
            current_length = len(para)
        else:
            current_chunk.append(para)
            current_length += len(para) + 2

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))
    return chunks

async def summarize_document(
    text: str,
    page_count: int,
    word_count: int,
    include_key_points: bool = True,
    detailed: bool = False
) -> Dict[str, Any]:
    chunks = chunk_text(text)
    
    if len(chunks) == 1:
        doc_context = chunks[0]
    else:
        # Hierarchical summarization for long documents
        chunk_summaries = []
        for i, c in enumerate(chunks[:5]):  # Process up to 5 large chunks
            prompt = f"Summarize section {i+1} of the document concisely in 2-3 paragraphs:\n\n{c}"
            summary_piece = await ai_service.generate(prompt, temperature=0.2)
            chunk_summaries.append(summary_piece)
        doc_context = "\n\n".join(chunk_summaries)

    detail_instruction = (
        "Provide a comprehensive, in-depth executive summary." if detailed 
        else "Provide a clear, high-level executive summary in 2 to 4 paragraphs."
    )

    prompt = f"""
You are an expert document analysis system. Analyze the following document text and return ONLY valid JSON with no markdown wrapping.

{detail_instruction}

Document Text:
{doc_context}

Output format required (pure JSON):
{{
  "summary": "Full summary text here...",
  "key_points": [
    "Key point 1...",
    "Key point 2...",
    "Key point 3..."
  ],
  "main_topics": ["Topic 1", "Topic 2", "Topic 3"]
}}
"""
    raw_response = await ai_service.generate(prompt, temperature=0.3)
    
    # Parse JSON cleanly
    cleaned = raw_response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
    except Exception:
        parsed = {
            "summary": raw_response.strip(),
            "key_points": [],
            "main_topics": []
        }

    return {
        "summary": parsed.get("summary", ""),
        "key_points": parsed.get("key_points", []) if include_key_points else [],
        "main_topics": parsed.get("main_topics", []),
        "page_count": page_count,
        "word_count": word_count,
        "ai_disclaimer": AI_DISCLAIMER
    }
