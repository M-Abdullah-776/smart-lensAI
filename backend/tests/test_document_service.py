import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.document_service import (
    extract_text_from_txt,
    chunk_text,
    compute_file_hash
)

def test_text_extraction():
    sample_text = "This is a test document for SmartLens AI document analyzer. It covers AI-powered analysis."
    bytes_data = sample_text.encode("utf-8")
    
    extracted, page_count, word_count = extract_text_from_txt(bytes_data)
    assert extracted == sample_text
    assert page_count >= 1
    assert word_count > 0
    print(f"[PASS] Text extraction verified: {word_count} words, {page_count} page(s)")

    file_hash = compute_file_hash(bytes_data)
    assert len(file_hash) == 64
    print(f"[PASS] File hashing verified: {file_hash[:16]}...")

if __name__ == "__main__":
    test_text_extraction()
    print("=== DOCUMENT SERVICE LOCAL TESTS PASSED ===")
