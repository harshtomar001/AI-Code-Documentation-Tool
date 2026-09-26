"""Factory for creating configured AI provider implementations."""

import os

from .gemini_provider import GeminiProvider
from .openrouter_provider import OpenRouterProvider
from .provider import AIProvider


class ProviderFactory:
    """Create an AI provider based on the configured provider name."""

    @staticmethod
    def create() -> AIProvider:
        """Create the configured AI provider.

        Returns:
            An initialized AIProvider implementation.

        Raises:
            ValueError: If the configured provider is unsupported.
        """
        provider_name = os.getenv("AI_PROVIDER", "gemini").lower()

        if provider_name == "gemini":
            return GeminiProvider()

        if provider_name == "openrouter":
            return OpenRouterProvider()

        raise ValueError(
            f"Unsupported AI provider: {provider_name}"
        )
