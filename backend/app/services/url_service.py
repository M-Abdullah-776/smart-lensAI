import ipaddress
import socket
import re
import logging
from urllib.parse import urlparse
import httpx
import json
from typing import Dict, Any, Tuple
from app.services.ai_service import ai_service
from app.utils.responses import SmartLensException, AI_DISCLAIMER

logger = logging.getLogger("smartlens.url")

PRIVATE_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

BLOCKED_HOSTNAMES = [
    "localhost",
    "metadata.google.internal",
    "metadata.internal",
    "instance-data",
]

def is_ssrf_safe_url(url: str) -> Tuple[bool, str]:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, "Only HTTP and HTTPS URLs are supported."

        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL: missing hostname."

        hostname_lower = hostname.lower()
        for blocked in BLOCKED_HOSTNAMES:
            if hostname_lower == blocked or hostname_lower.endswith("." + blocked):
                return False, "Access to internal, local, and metadata endpoints is restricted (SSRF protection)."

        # Check if direct IP
        try:
            ip = ipaddress.ip_address(hostname)
            for net in PRIVATE_IP_NETWORKS:
                if ip in net:
                    return False, f"Access to private IP address {ip} is restricted (SSRF protection)."
            return True, ""
        except ValueError:
            pass

        # Resolve DNS to check IP
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip = ipaddress.ip_address(ip_str)
                for net in PRIVATE_IP_NETWORKS:
                    if ip in net:
                        return False, f"URL resolves to restricted private address {ip_str} (SSRF protection)."
        except socket.gaierror:
            return False, f"Could not resolve domain name '{hostname}'. The website does not exist or DNS lookup failed."

        return True, ""
    except Exception as e:
        return False, f"URL validation error: {str(e)}"

async def fetch_web_page(url: str) -> Tuple[str, str, int]:
    clean_url = url.strip()
    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        clean_url = "https://" + clean_url

    is_safe, error_msg = is_ssrf_safe_url(clean_url)
    if not is_safe:
        raise SmartLensException(400, error_msg)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, max_redirects=5) as client:
            response = await client.get(clean_url, headers=headers)
            
            # Verify final redirected URL is also SSRF-safe
            final_url = str(response.url)
            is_redirect_safe, redirect_err = is_ssrf_safe_url(final_url)
            if not is_redirect_safe:
                raise SmartLensException(400, f"Redirected to unsafe URL: {redirect_err}")

            if response.status_code == 403:
                raise SmartLensException(403, "Access to this website is forbidden (HTTP 403). The website may require login or block automated access.")
            elif response.status_code == 404:
                raise SmartLensException(404, "Web page not found (HTTP 404). Please verify the link is active and spelled correctly.")
            elif response.status_code == 401:
                raise SmartLensException(401, "This page requires authentication or login credentials to view.")
            elif response.status_code >= 500:
                raise SmartLensException(502, f"The target website returned a server error (HTTP {response.status_code}).")
            elif response.status_code != 200:
                raise SmartLensException(400, f"Failed to retrieve page content (HTTP {response.status_code}).")

            content_type = response.headers.get("content-type", "").lower()
            # Allow text/html, application/xhtml, text/plain, or empty
            if content_type and not any(t in content_type for t in ["text/html", "application/xhtml", "text/plain", "application/xml"]):
                raise SmartLensException(400, f"URL returned non-textual content ({content_type}). Please provide a webpage or article link.")

            # Limit to 10MB
            if len(response.content) > 10 * 1024 * 1024:
                raise SmartLensException(400, "Webpage content exceeds 10MB maximum download limit.")

            return response.text, final_url, response.status_code

    except httpx.TimeoutException:
        raise SmartLensException(504, "Connection timed out while trying to reach the website. The server took too long to respond.")
    except httpx.ConnectError:
        raise SmartLensException(400, "Failed to connect to the website. The server may be down, domain expired, or unreachable.")
    except SmartLensException:
        raise
    except Exception as e:
        raise SmartLensException(500, f"Failed to fetch webpage: {str(e)}")

def extract_main_text(html: str, url: str) -> Tuple[str, str, str]:
    """
    Extract readable text using advanced BeautifulSoup parsing with trafilatura support.
    Returns (cleaned_text, title, language).
    """
    title = ""
    language = "en"
    text = ""

    # Attempt 1: trafilatura (if lxml_html_clean is available)
    try:
        import trafilatura
        extracted = trafilatura.extract(
            html,
            url=url,
            include_comments=False,
            include_tables=True,
            no_fallback=False
        )
        if extracted and len(extracted.split()) > 30:
            text = extracted.strip()
            metadata = trafilatura.extract_metadata(html)
            if metadata and metadata.title:
                title = metadata.title
            if metadata and metadata.language:
                language = metadata.language
    except Exception:
        pass

    # Attempt 2: Advanced BeautifulSoup extraction
    if not text:
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, "html.parser")

            # Extract title: <meta property="og:title"> -> <title> -> <h1>
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                title = og_title["content"].strip()
            elif soup.title and soup.title.string:
                title = soup.title.string.strip()
            elif soup.find("h1"):
                title = soup.find("h1").get_text().strip()

            # Detect language: <html lang="...">
            html_tag = soup.find("html")
            if html_tag and html_tag.get("lang"):
                language = html_tag["lang"].split("-")[0].lower()

            # Strip non-content and clutter elements
            for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "svg", "form", "iframe"]):
                tag.decompose()

            # Target primary article container
            article = (
                soup.find(["article", "main"]) or 
                soup.find(class_=re.compile(r"article|content|post|entry|main", re.I)) or 
                soup.body
            )

            if article:
                # Gather content blocks: paragraphs, headings, list items
                blocks = []
                for elem in article.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
                    txt = elem.get_text().strip()
                    # Filter out short menu or cookie items
                    if txt and len(txt.split()) >= 3:
                        blocks.append(txt)

                if blocks:
                    text = "\n\n".join(blocks)
                else:
                    lines = (line.strip() for line in article.get_text().splitlines())
                    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                    text = "\n".join(c for c in chunks if c)
        except Exception:
            pass

    if not text or len(text.split()) < 15:
        raise SmartLensException(
            400,
            "No readable textual content could be extracted from this page. It may be a JavaScript-rendered single-page app (SPA) or protected by a dynamic anti-bot challenge."
        )

    if not title:
        parsed = urlparse(url)
        title = parsed.hostname or url

    return text, title, language

async def analyze_url_content(url: str) -> Dict[str, Any]:
    html, final_url, status_code = await fetch_web_page(url)
    text, title, lang = extract_main_text(html, final_url)

    words = text.split()
    word_count = len(words)
    # Average reading speed is 238 words per minute
    reading_time_minutes = max(1, round(word_count / 238))
    domain = urlparse(final_url).hostname or ""

    # Feed up to 60,000 characters (~10,000 words) for full article coverage
    text_sample = text[:60000]

    prompt = f"""You are SmartLens AI, an expert web content analyst and researcher.
Carefully review the following extracted webpage content and generate an accurate, objective, and well-structured analysis.

Page Title: {title}
Domain: {domain}

Webpage Content:
\"\"\"
{text_sample}
\"\"\"

Output format required (pure JSON only, no markdown code fence, no explanation):
{{
  "summary": "Cohesive, comprehensive 2-4 paragraph synthesis covering the core message, key arguments, and conclusions of the page...",
  "key_points": [
    "Specific, factual takeaway or key finding 1",
    "Specific, factual takeaway or key finding 2",
    "Specific, factual takeaway or key finding 3",
    "Specific, factual takeaway or key finding 4",
    "Specific, factual takeaway or key finding 5"
  ],
  "main_topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "language": "{lang}"
}}
"""
    raw_response = await ai_service.generate(prompt, temperature=0.2)

    # Robust JSON extraction
    cleaned = raw_response.strip()
    if "```" in cleaned:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if match:
            cleaned = match.group(1).strip()

    if not (cleaned.startswith("{") and cleaned.endswith("}")):
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            cleaned = match.group(0).strip()

    try:
        parsed = json.loads(cleaned)
    except Exception:
        parsed = {}

    summary = parsed.get("summary", "").strip()
    if not summary:
        summary = raw_response.strip()

    raw_kp = parsed.get("key_points", [])
    if isinstance(raw_kp, str):
        raw_kp = [raw_kp]
    key_points = [str(p).strip() for p in raw_kp if str(p).strip()]

    raw_topics = parsed.get("main_topics", [])
    if isinstance(raw_topics, str):
        raw_topics = [raw_topics]
    main_topics = [str(t).strip() for t in raw_topics if str(t).strip()]

    return {
        "url": final_url,
        "title": title,
        "domain": domain,
        "status_code": status_code,
        "summary": summary,
        "key_points": key_points,
        "main_topics": main_topics,
        "language": parsed.get("language", lang),
        "word_count": word_count,
        "reading_time_minutes": reading_time_minutes,
        "ai_disclaimer": AI_DISCLAIMER
    }
