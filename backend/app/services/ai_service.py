import asyncio
import logging
from typing import Optional
from app.config import settings
from app.utils.responses import SmartLensException

logger = logging.getLogger("smartlens.ai")

class AIService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower().strip()
        self.api_key = settings.AI_API_KEY.strip()
        self.model = settings.AI_MODEL.strip()

    async def generate(self, prompt: str, temperature: float = 0.3, max_tokens: int = 4096) -> str:
        """
        Unified provider-agnostic text generation with exponential backoff retries.
        """
        if not self.api_key:
            raise SmartLensException(
                status_code=503,
                detail="AI service is not configured. Please supply an AI API key in the server environment."
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
                    raise SmartLensException(
                        status_code=502,
                        detail="The AI processing service encountered a temporary error. Please try again in a moment."
                    )
                await asyncio.sleep(backoff ** (attempt + 1))

    async def _generate_gemini(self, prompt: str, temperature: float, max_tokens: int) -> str:
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        model_name = self.model if self.model else "gemini-1.5-pro"
        
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        # Run blocking SDK in executor to prevent blocking the event loop
        loop = asyncio.get_running_loop()
        def _call():
            model = genai.GenerativeModel(model_name=model_name, generation_config=generation_config)
            response = model.generate_content(prompt)
            return response.text

        return await loop.run_in_executor(None, _call)

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
