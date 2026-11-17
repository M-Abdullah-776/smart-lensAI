import ipaddress
import socket
from urllib.parse import urlparse
import httpx
import json
from typing import Dict, Any, Tuple
from app.services.ai_service import ai_service
from app.utils.responses import SmartLensException, AI_DISCLAIMER

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
    is_safe, error_msg = is_ssrf_safe_url(url)
    if not is_safe:
        raise SmartLensException(400, error_msg)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 SmartLensBot/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, max_redirects=5) as client:
            response = await client.get(url, headers=headers)
            
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
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                raise SmartLensException(400, f"URL returned non-HTML content ({content_type}). Please provide a webpage link.")

            # Limit to 10MB
            if len(response.content) > 10 * 1024 * 1024:
                raise SmartLensException(400, "Webpage content exceeds 10MB maximum download limit.")

            return response.text, final_url, response.status_code

    except httpx.TimeoutException:
        raise SmartLensException(504, "Connection timed out while trying to reach the website. The server took too long to respond.")
    except httpx.ConnectError:
        raise SmartLensException(400, "Failed to connect to the website. The server may be down or unreachable.")
    except SmartLensException:
        raise
    except Exception as e:
        raise SmartLensException(500, f"Failed to fetch webpage: {str(e)}")

def extract_main_text(html: str, url: str) -> Tuple[str, str, str]:
    """
    Extract readable text using trafilatura, falling back to BeautifulSoup.
    Returns (cleaned_text, title, language).
    """
    title = ""
    language = "en"
    text = ""

    # Attempt 1: trafilatura
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

    # Attempt 2: BeautifulSoup fallback
    if not text:
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, "html.parser")
            
            if not title:
                title_tag = soup.find("title")
                if title_tag and title_tag.string:
                    title = title_tag.string.strip()

            # Remove scripts, styles, navigations, footers, headers
            for element in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "svg", "form"]):
                element.decompose()

            # Get main or article if present
            main_element = soup.find("main") or soup.find("article") or soup.find("body")
            if main_element:
                lines = (line.strip() for line in main_element.get_text().splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = "\n".join(chunk for chunk in chunks if chunk)
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

    # Sample text for AI prompt
    text_sample = text[:15000]

    prompt = f"""
You are an expert web content summarizer and research analyst.
Analyze the following extracted webpage content and return ONLY pure JSON with no markdown tags.

Page Title: {title}
Domain: {domain}

Webpage Content:
{text_sample}

Output format required (pure JSON):
{{
  "summary": "Clear, objective 2-4 paragraph synthesis of the article/page...",
  "key_points": [
    "Key finding or discussion point 1",
    "Key finding or discussion point 2",
    "Key finding or discussion point 3",
    "Key finding or discussion point 4",
    "Key finding or discussion point 5"
  ],
  "main_topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "language": "{lang}"
}}
"""
    raw_response = await ai_service.generate(prompt, temperature=0.3)

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
            "main_topics": [],
            "language": lang
        }

    return {
        "url": final_url,
        "title": title,
        "domain": domain,
        "status_code": status_code,
        "summary": parsed.get("summary", ""),
        "key_points": parsed.get("key_points", []),
        "main_topics": parsed.get("main_topics", []),
        "language": parsed.get("language", lang),
        "word_count": word_count,
        "reading_time_minutes": reading_time_minutes,
        "ai_disclaimer": AI_DISCLAIMER
    }
