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
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)

        # Normalize model name: replace legacy/unsupported gemini-1.5-pro with gemini-1.5-flash
        raw_model = (self.model or "gemini-1.5-flash").strip()
        if raw_model.startswith("models/"):
            raw_model = raw_model.replace("models/", "")
        if "gemini-1.5-pro" in raw_model:
            raw_model = "gemini-1.5-flash"
        
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        loop = asyncio.get_running_loop()
        def _call_model(target_model: str):
            model = genai.GenerativeModel(model_name=target_model, generation_config=generation_config)
            response = model.generate_content(prompt)
            if not response or not hasattr(response, "text"):
                raise SmartLensException(502, "The AI model returned an empty response.")
            return response.text

        try:
            return await loop.run_in_executor(None, lambda: _call_model(raw_model))
        except Exception as exc:
            err_text = str(exc)
            # If the model returned 404 or not found, try fallback models
            if "404" in err_text or "not found" in err_text.lower():
                logger.warning(f"Gemini model '{raw_model}' returned 404. Attempting automatic fallback models...")
                candidate_models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-pro"]
                for candidate in candidate_models:
                    if candidate == raw_model:
                        continue
                    try:
                        logger.info(f"Trying Gemini fallback: {candidate}")
                        return await loop.run_in_executor(None, lambda c=candidate: _call_model(c))
                    except Exception as fb_err:
                        logger.warning(f"Fallback {candidate} failed: {fb_err}")
                        continue
            raise

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
