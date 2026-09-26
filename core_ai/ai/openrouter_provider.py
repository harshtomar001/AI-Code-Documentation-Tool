"""OpenRouter AI provider implementation."""

import os

from openai import OpenAI

from ..exceptions import AIProviderError
from .provider import AIProvider


class OpenRouterProvider(AIProvider):
    """AI provider implementation backed by OpenRouter."""

    def __init__(self) -> None:
        """Initialize the OpenRouter client using the configured API key.

        Raises:
            ValueError: If OPENROUTER_API_KEY is not configured.
        """
        api_key = os.getenv("OPENROUTER_API_KEY")

        if not api_key:
            raise ValueError("OPENROUTER_API_KEY is not configured")

        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            timeout=60.0,
            max_retries=2,
        )

    def generate(self, prompt: str) -> str:
        """Generate documentation content using OpenRouter.

        Args:
            prompt: Prompt sent to the configured OpenRouter model.

        Returns:
            The generated response text.

        Raises:
            AIProviderError: If OpenRouter fails to generate a response
                or returns empty content.
        """
        try:
            response = self.client.chat.completions.create(
                model="openrouter/free",
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
                    "OpenRouter returned an empty response"
                )

            return content

        except AIProviderError:
            raise

        except Exception as exc:
            raise AIProviderError(
                "OpenRouter provider failed to generate a response"
            ) from exc