"""Groq AI provider implementation."""

import os

from groq import Groq

from ..exceptions import AIProviderError
from .provider import AIProvider


class GroqProvider(AIProvider):
    """AI provider implementation backed by Groq."""

    def __init__(self) -> None:
        """Initialize the Groq client using the configured API key.

        Raises:
            ValueError: If GROQ_API_KEY is not configured.
        """
        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise ValueError("GROQ_API_KEY is not configured")

        self.model = os.getenv(
            "GROQ_MODEL",
            "openai/gpt-oss-120b",
        )

        self.client = Groq(
            api_key=api_key,
            timeout=60.0,
            max_retries=2,
        )

    def generate(self, prompt: str) -> str:
        """Generate documentation content using Groq.

        Args:
            prompt: Prompt sent to the configured Groq model.

        Returns:
            The generated response text.

        Raises:
            AIProviderError: If Groq fails to generate a response
                or returns empty content.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
            )

            content = response.choices[0].message.content

            if content is None:
                raise AIProviderError(
                    "Groq returned an empty response"
                )

            return content

        except AIProviderError:
            raise

        except Exception as exc:
            raise AIProviderError(
                f"Groq provider failed to generate a response: {exc}"
            ) from exc