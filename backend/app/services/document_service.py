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
    # Modern LLMs (e.g. Gemini 1.5 Flash) have large context windows (1M tokens).
    # Keep up to 120,000 characters (~20,000 words) in a single pass to maintain full document coherence
    # without triggering multi-call rate limits.
    max_text_chars = 120000
    if len(text) > max_text_chars:
        # Take the opening sections (context/background) and closing sections (conclusions/recommendations)
        half = max_text_chars // 2
        doc_context = text[:half] + "\n\n[... Middle sections omitted for length ...]\n\n" + text[-half:]
    else:
        doc_context = text

    detail_instruction = (
        "Provide an in-depth, comprehensive executive summary with key background, thorough findings, and strategic takeaways."
        if detailed else
        "Provide a clear, high-impact executive summary in 2 to 4 well-structured paragraphs covering the document's core purpose, major results, and conclusions."
    )

    prompt = f"""You are an advanced document intelligence system. Carefully read and analyze the following document text, then generate an accurate, factual, and well-structured response.

ANALYSIS INSTRUCTIONS:
1. Executive Summary: {detail_instruction}
2. Key Points: Extract 4 to 8 specific, factual key findings (include exact data, dates, statistics, and conclusions where present).
3. Main Topics: Identify 3 to 6 major thematic tags or subject areas.

DOCUMENT DETAILS:
- Approximate Pages: {page_count}
- Word Count: {word_count}

DOCUMENT CONTENT:
\"\"\"
{doc_context}
\"\"\"

RESPONSE FORMAT:
You MUST respond with pure JSON only (no explanations, no preamble). Follow this exact JSON schema:
{{
  "summary": "Cohesive executive summary of the document...",
  "key_points": [
    "Key point or finding 1 with details",
    "Key point or finding 2 with details",
    "Key point or finding 3 with details",
    "Key point or finding 4 with details"
  ],
  "main_topics": ["Topic 1", "Topic 2", "Topic 3"]
}}
"""
    raw_response = await ai_service.generate(prompt, temperature=0.2)
    
    # Parse JSON cleanly
    cleaned = raw_response.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # If wrapped in other text, attempt to locate JSON object
    if not (cleaned.startswith("{") and cleaned.endswith("}")):
        import re
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)

    try:
        parsed = json.loads(cleaned)
    except Exception:
        parsed = {
            "summary": raw_response.strip(),
            "key_points": [],
            "main_topics": []
        }

    summary_text = parsed.get("summary", "").strip() or raw_response.strip()
    key_points_list = parsed.get("key_points", []) if include_key_points else []
    main_topics_list = parsed.get("main_topics", [])

    return {
        "summary": summary_text,
        "key_points": key_points_list,
        "main_topics": main_topics_list,
        "page_count": page_count,
        "word_count": word_count,
        "ai_disclaimer": AI_DISCLAIMER
    }
