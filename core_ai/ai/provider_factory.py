import os

from .provider import AIProvider
from .gemini_provider import GeminiProvider
from .openrouter_provider import OpenRouterProvider


class ProviderFactory:

    @staticmethod
    def create() -> AIProvider:

        provider_name = os.getenv("AI_PROVIDER", "gemini").lower()

        if provider_name == "gemini":
            return GeminiProvider()

        if provider_name == "openrouter":
            return OpenRouterProvider()

        raise ValueError(
            f"Unsupported AI provider: {provider_name}"
        )
