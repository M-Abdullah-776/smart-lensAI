import asyncio
import logging
from typing import Optional
from app.config import settings
from app.utils.responses import SmartLensException

logger = logging.getLogger("smartlens.ai")

class AIService:
    @property
    def provider(self) -> str:
        return (settings.AI_PROVIDER or "gemini").lower().strip()

    @property
    def api_key(self) -> str:
        return (settings.AI_API_KEY or "").strip()

    @property
    def model(self) -> str:
        return (settings.AI_MODEL or "gemini-1.5-flash").strip()

    async def generate(self, prompt: str, temperature: float = 0.3, max_tokens: int = 4096) -> str:
        """
        Unified provider-agnostic text generation with exponential backoff retries.
        """
        if not self.api_key:
            raise SmartLensException(
                status_code=503,
                detail="AI service is not configured. Please add an AI_API_KEY (e.g. Gemini API Key) to the server environment."
            )

        max_retries = 3
        backoff = 1.5

        for attempt in range(max_retries):
            try:
                if self.provider == "gemini":
                    return await self._generate_gemini(prompt, temperature, max_tokens)
                elif self.provider == "openai":
                    return await self._generate_openai(prompt, temperature, max_tokens)
                elif self.provider == "anthropic":
                    return await self._generate_anthropic(prompt, temperature, max_tokens)
                else:
                    raise SmartLensException(
                        status_code=500,
                        detail=f"Unsupported AI provider '{self.provider}'. Use 'gemini', 'openai', or 'anthropic'."
                    )
            except SmartLensException:
                raise
            except Exception as e:
                logger.warning(f"AI generation attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    logger.error(f"AI generation failed after {max_retries} attempts: {str(e)}", exc_info=True)
                    error_msg = str(e)
                    if "API_KEY_INVALID" in error_msg or "API key not valid" in error_msg:
                        raise SmartLensException(status_code=502, detail="The configured AI API key is invalid. Please verify your Gemini API key.")
                    elif "ResourceExhausted" in error_msg or "429" in error_msg:
                        raise SmartLensException(status_code=429, detail="AI rate limit reached. Please wait a moment before trying again.")
                    else:
                        raise SmartLensException(
                            status_code=502,
                            detail=f"AI service error: {str(e)[:200]}"
                        )
                await asyncio.sleep(backoff ** (attempt + 1))

    async def _generate_gemini(self, prompt: str, temperature: float, max_tokens: int) -> str:
        """
        Direct REST client for Google Generative Language API.
        Avoids the deprecated google-generativeai SDK gRPC deadlock and timeout issues.
        """
        import httpx

        model_name = (self.model or "gemini-flash-latest").strip()
        if model_name.startswith("models/"):
            model_name = model_name.replace("models/", "")

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }

        candidates = [model_name, "gemini-flash-latest", "gemini-pro-latest", "gemini-1.5-flash", "gemini-2.0-flash"]
        unique_candidates = []
        for c in candidates:
            if c and c not in unique_candidates:
                unique_candidates.append(c)

        last_error = ""
        async with httpx.AsyncClient(timeout=30.0) as client:
            for model_candidate in unique_candidates:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_candidate}:generateContent?key={self.api_key}"
                try:
                    res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})

                    if res.status_code == 200:
                        data = res.json()
                        candidates_data = data.get("candidates", [])
                        if candidates_data and "content" in candidates_data[0]:
                            parts = candidates_data[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                return parts[0]["text"]
                        return ""

                    err_code = res.status_code
                    try:
                        err_json = res.json().get("error", {})
                        err_msg = err_json.get("message", res.text)
                    except Exception:
                        err_msg = res.text
                    last_error = err_msg

                    if err_code == 429:
                        raise SmartLensException(
                            429,
                            "AI Quota Exceeded: Your Gemini API key has exceeded its quota limits. Please create a new free API key at https://aistudio.google.com/app/apikey"
                        )
                    elif err_code == 400 and ("API_KEY_INVALID" in err_msg or "API key not valid" in err_msg):
                        raise SmartLensException(
                            401,
                            "Invalid Gemini API Key. Please verify your AI_API_KEY in Render environment settings."
                        )
                    elif err_code == 404:
                        logger.warning(f"Gemini model {model_candidate} returned 404, trying next candidate...")
                        continue
                    else:
                        logger.warning(f"Gemini API returned {err_code} for {model_candidate}: {err_msg[:200]}")
                        continue
                except SmartLensException:
                    raise
                except httpx.TimeoutException:
                    logger.warning(f"Timeout calling Gemini {model_candidate}")
                    continue
                except Exception as exc:
                    logger.warning(f"Error calling {model_candidate}: {exc}")
                    continue

        raise SmartLensException(
            502,
            f"Gemini AI error: {last_error[:250] if last_error else 'Unable to generate content with current API key. Please check your key at https://aistudio.google.com/app/apikey'}"
        )

    async def _generate_openai(self, prompt: str, temperature: float, max_tokens: int) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self.api_key)
        model_name = self.model if self.model else "gpt-4o-mini"
        response = await client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def _generate_anthropic(self, prompt: str, temperature: float, max_tokens: int) -> str:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=self.api_key)
        model_name = self.model if self.model else "claude-3-5-sonnet-20240620"
        response = await client.messages.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.content[0].text or ""

ai_service = AIService()
