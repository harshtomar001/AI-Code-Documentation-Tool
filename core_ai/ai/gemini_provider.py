"""Google Gemini AI provider implementation."""

import os

from google import genai
from google.genai import types
from google.genai.errors import ServerError

from ..exceptions import AIProviderError
from .provider import AIProvider
from .retry import retry_with_backoff


class GeminiProvider(AIProvider):
    """AI provider implementation backed by Google Gemini."""

    def __init__(self) -> None:
        """Initialize the Gemini client using the configured API key.

        Raises:
            ValueError: If GEMINI_API_KEY is not configured.
        """
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        self.model = os.getenv(
            "GEMINI_MODEL",
            "gemini-3.5-flash-lite",
        )

        self.client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                retry_options=types.HttpRetryOptions(
                    attempts=5,
                    initial_delay=1.0,
                    max_delay=8.0,
                    jitter=0.25,
                    http_status_codes=[408, 429, 500, 502, 503, 504],
                ),
            ),
        )

    def generate(self, prompt: str) -> str:
        """Generate documentation content using Gemini.

        Args:
            prompt: Prompt sent to the Gemini model.

        Returns:
            The generated response text.

        Raises:
            AIProviderError: If Gemini fails to generate a response or
                returns an empty response.
        """

        def operation() -> str:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
            )

            if response.text is None:
                raise AIProviderError("Gemini returned an empty response")

            return response.text

        try:
            return retry_with_backoff(
                operation,
                retry_if=(ServerError,),
            )

        except AIProviderError:
            raise

        except Exception as exc:
            raise AIProviderError(
                f"Gemini provider failed to generate a response "
                f"using model '{self.model}'"
            ) from exc
