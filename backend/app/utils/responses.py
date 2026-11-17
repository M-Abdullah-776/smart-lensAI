from fastapi import HTTPException
import logging

logger = logging.getLogger("smartlens")

class SmartLensException(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)

AI_DISCLAIMER = "AI-generated, may not be 100% accurate."
RESUME_DISCLAIMER = "Suggestions only, no guarantee of selection or interview outcomes."
