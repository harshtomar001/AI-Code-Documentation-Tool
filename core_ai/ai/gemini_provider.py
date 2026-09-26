"""Google Gemini AI provider implementation."""

import os

from google import genai

from ..exceptions import AIProviderError
from .provider import AIProvider
from google.genai.errors import ServerError
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

        self.client = genai.Client(api_key=api_key)

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
                model="gemini-3.5-flash-lite",
                contents=prompt,
            )

            if response.text is None:
                raise AIProviderError(
                    "Gemini returned an empty response"
                )

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
                "Gemini provider failed to generate a response"
            ) from exc