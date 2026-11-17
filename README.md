# SmartLens AI — Production-Grade Multi-Source Analysis Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.111-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_3.4-38B2AC.svg)](https://tailwindcss.com/)

SmartLens AI is a full-stack, enterprise-grade content analysis web application engineered to replace fake, hardcoded prototypes with real text extraction, live scrapers, deterministic scoring, and provider-agnostic AI adapters.

---

## 🌟 Core Features & Tools

1. **📄 Document Analyzer (`/document-analyzer`)**
   - High-throughput text parsing for **PDF, DOCX, and TXT** (up to 10MB).
   - Scanned PDF detection with explicit, friendly warnings.
   - Hierarchical summarization with bulleted key points and topic extraction.
   - Ephemeral file storage (files are immediately discarded from memory after processing).

2. **🎥 YouTube Summarizer (`/youtube-summarizer`)**
   - URL validation (`watch`, `youtu.be`, `shorts`, `embed`).
   - Closed-caption extraction via YouTube Transcripts API.
   - Time-coded key moments and actionable takeaways.

3. **💬 PDF Question & Answer (`/pdf-qa`)**
   - Page-indexed document Q&A powered by BM25 keyword retrieval.
   - Multi-turn conversation on a single uploaded PDF without re-uploading.
   - Strict factual citations (`[Page X]`) and anti-hallucination guardrails.

4. **🎯 Resume Analyzer & Job Matcher (`/resume-analyzer`)**
   - Deterministic ATS evaluation (temperature `0.0` for identical repeatable scoring).
   - Four-pillar breakdown: Formatting, Keywords, Impact, and Completeness.
   - Job matcher with skill gap detection and tailoring recommendations.

5. **🌐 URL Content Analyzer (`/url-analyzer`)**
   - SSRF-protected web fetcher (blocks private subnets, localhost, and cloud metadata).
   - Boilerplate stripping via Trafilatura and BeautifulSoup.
   - Word count, reading time estimation, and executive brief generation.

6. **🔒 Security, History & Administration (`/admin`, `/history`)**
   - Bcrypt password hashing, JWT access/refresh token rotation, and email verification.
   - Dedicated Admin Dashboard with real-time usage metrics and user management.
   - System-wide announcement banner and tool master switches.

---

## 🚀 One-Command Launch (Docker Compose)

The easiest way to start SmartLens AI with PostgreSQL, FastAPI, and React is via Docker:

```bash
# 1. Clone or navigate to the project directory
cd "C:\Users\hp\Documents\SRE Project"

# 2. Add your AI API key in docker-compose.yml or export it
export AI_API_KEY="your-gemini-or-openai-key"

# 3. Start all services
docker compose up --build
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Default Administrator Credentials:**
  - **Email:** `admin@smartlens.ai`
  - **Password:** `Admin@12345`

---

## 💻 Local Development Setup (Without Docker)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**

### Step 1: Start the Backend (FastAPI + SQLite)

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and configure your AI API key
cp .env.example .env

# Run FastAPI with live reload
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The database (`smartlens.db`) and administrator account will be automatically created on startup.

### Step 2: Start the Frontend (React + Vite)

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Environment Configuration (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLite or PostgreSQL connection string | `sqlite:///./smartlens.db` |
| `SECRET_KEY` | 32+ character JWT cryptographic secret | `smartlens_production_super_secret...` |
| `AI_PROVIDER` | AI provider (`gemini`, `openai`, or `anthropic`) | `gemini` |
| `AI_API_KEY` | API key from Google AI Studio / OpenAI / Anthropic | *(Required for AI calls)* |
| `AI_MODEL` | Provider model identifier | `gemini-1.5-pro` |
| `EMAIL_VERIFICATION`| Require email confirmation link to unlock features | `false` (dev mode) |
| `MAX_UPLOAD_SIZE_MB`| File size cap for documents and resumes | `10` |
| `DAILY_AI_REQUEST_LIMIT`| Maximum daily AI calls per registered user | `50` |

---

## 🛡️ Requirements Specification Compliance Matrix

| Requirement ID | Specification | Implemented In |
|---|---|---|
| **FR-01-001 - 003** | User Registration, Email Verification & Login | `app/routers/auth.py`, `Register.jsx`, `Login.jsx` |
| **FR-01-005 - 007** | Document Analyzer (PDF, DOCX, TXT max 10MB) | `app/services/document_service.py`, `DocumentAnalyzer.jsx` |
| **FR-01-008 - 011** | YouTube Summarizer with timestamped key takeaways | `app/services/youtube_service.py`, `YouTubeSummarizer.jsx` |
| **FR-01-012 - 015** | PDF Q&A with strict citations & BM25 retrieval | `app/services/pdf_qa_service.py`, `PdfQA.jsx` |
| **FR-01-016 - 019** | Resume ATS Diagnostics & Job Matcher | `app/services/resume_service.py`, `ResumeAnalyzer.jsx` |
| **FR-01-020 - 022** | URL Content Analyzer with SSRF Protection | `app/services/url_service.py`, `UrlAnalyzer.jsx` |
| **FR-01-023 - 025** | History archive, per-item delete, and text export | `app/routers/history.py`, `History.jsx` |
| **FR-02-001 - 010** | Admin User Controls, Settings, Announcements & Audit Logs | `app/routers/admin.py`, `pages/admin/*` |
| **BRL-006, NFR-006** | Ephemeral File Retention (immediate deletion) | All routers (files processed strictly in-memory) |
| **BRL-010, BRL-012** | Mandatory AI Disclaimers & Advice Limitations | `components/AiDisclaimer.jsx`, `ResultCard.jsx` |
| **BRL-016, BRL-018** | SSRF Protection & Zero Stack Trace Leaks | `app/services/url_service.py`, `app/main.py` |
| **DC-001 - DC-006** | Decoupled Architecture, REST APIs, Tailwind UI | FastAPI Backend + React Vite Frontend |

---

## ⚠️ Known Boundaries & Realistic Limitations

1. **Scanned Documents (Image PDFs):** Pure image/scanned documents without an embedded text layer will be detected and rejected with a helpful warning message asking the user to provide a text-based document.
2. **YouTube Videos without Closed Captions:** Videos that have disabled transcripts, are age-restricted, private, or region-locked will display a friendly message explaining that closed captions could not be fetched.
3. **SSRF Restricted Endpoints:** Any URLs resolving to local network ranges (`127.0.0.1`, `10.x.x.x`, `192.168.x.x`, `169.254.169.254`) are systematically blocked to ensure zero server-side request forgery risks.
4. **JavaScript Single Page Applications (SPAs):** For pages requiring heavy dynamic client-side rendering (e.g. React SPAs with empty initial HTML), the scraper falls back to available meta tags or alerts the user if no text body exists.
