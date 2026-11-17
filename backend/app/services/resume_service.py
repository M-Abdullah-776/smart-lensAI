import json
from typing import Dict, Any, Optional
from app.services.ai_service import ai_service
from app.services.document_service import extract_text_from_pdf, extract_text_from_docx
from app.utils.responses import SmartLensException, AI_DISCLAIMER, RESUME_DISCLAIMER

def extract_resume_text(file_bytes: bytes, filename: str) -> str:
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        text, _, _ = extract_text_from_pdf(file_bytes)
        return text
    elif lower_name.endswith(".docx"):
        text, _, _ = extract_text_from_docx(file_bytes)
        return text
    elif lower_name.endswith(".txt"):
        try:
            return file_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            return file_bytes.decode("latin-1", errors="replace").strip()
    else:
        raise SmartLensException(400, "Unsupported file format. Please upload a PDF, DOCX, or TXT file.")

async def analyze_and_score_resume(
    resume_text: str,
    job_description: Optional[str] = None
) -> Dict[str, Any]:
    if not resume_text or len(resume_text.split()) < 30:
        raise SmartLensException(400, "The uploaded resume does not contain enough text to analyze.")

    clean_jd = (job_description or "").strip()
    has_jd = len(clean_jd.split()) >= 15

    jd_section = f"\nTarget Job Description:\n{clean_jd}\n" if has_jd else ""

    # Note: Prompt strictly instructs temperature 0 execution and pure JSON return.
    prompt = f"""
You are a senior technical recruiter, ATS specialist, and career coach.
Analyze the following resume objectively and return ONLY valid pure JSON with no markdown wrapping.

Rules:
1. Provide an overall score between 0 and 100 based strictly on industry standards.
2. Break down the score into 4 pillars (0-100 each):
   - formatting: visual structure, consistency, clean layout
   - keywords: presence of relevant skills, domain terminology, toolnames
   - impact: quantified achievements, action verbs, measurable outcomes
   - completeness: contact info, education, work experience, projects, skills
3. Extract detected sections (Contact, Education, Experience, Skills, Projects).
4. Provide genuine, actionable strengths, weaknesses, and concrete rewrite suggestions.
{ "5. Because a job description is provided, calculate job_match_percentage (0-100), list matching_points, missing_skills, and alignment_recommendations." if has_jd else "" }

Resume Content:
{resume_text[:14000]}
{jd_section}

Output format required (pure JSON):
{{
  "overall_score": 82,
  "breakdown": {{
    "formatting": 85,
    "keywords": 80,
    "impact": 75,
    "completeness": 90
  }},
  "extracted_sections": {{
    "has_contact": true,
    "has_education": true,
    "has_experience": true,
    "has_skills": true,
    "has_projects": true
  }},
  "strengths": [
    "Clear chronological timeline...",
    "Strong technical skills highlighted..."
  ],
  "weaknesses": [
    "Lacks quantified business metrics in bullets...",
    "Missing specific version control tools..."
  ],
  "suggestions": [
    "Rewrite bullet X to emphasize percentage growth...",
    "Add certification details..."
  ]{f''',
  "job_match": {{
    "match_percentage": 78,
    "matching_points": ["Matches requirement for Python...", "Has experience with Docker"],
    "missing_requirements": ["Kubernetes orchestration experience not mentioned", "AWS certification preferred"],
    "tailoring_advice": "Explicitly highlight any AWS projects in your experience section."
  }}''' if has_jd else ''}
}}
"""
    # Strict temperature=0.0 ensures deterministic results for identical resumes
    raw_response = await ai_service.generate(prompt, temperature=0.0)

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
        raise SmartLensException(500, "Failed to parse structured resume analysis output.")

    # Validate output structure
    breakdown = parsed.get("breakdown", {})
    overall_score = parsed.get("overall_score", 70)

    result = {
        "overall_score": overall_score,
        "breakdown": {
            "formatting": breakdown.get("formatting", 75),
            "keywords": breakdown.get("keywords", 70),
            "impact": breakdown.get("impact", 65),
            "completeness": breakdown.get("completeness", 80),
        },
        "extracted_sections": parsed.get("extracted_sections", {}),
        "strengths": parsed.get("strengths", []),
        "weaknesses": parsed.get("weaknesses", []),
        "suggestions": parsed.get("suggestions", []),
        "ai_disclaimer": AI_DISCLAIMER,
        "resume_disclaimer": RESUME_DISCLAIMER,
    }

    if has_jd and "job_match" in parsed:
        result["job_match"] = parsed["job_match"]

    return result
