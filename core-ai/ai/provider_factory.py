import os

from dotenv import load_dotenv

from ai.provider import AIProvider
from ai.gemini_provider import GeminiProvider
from ai.openrouter_provider import OpenRouterProvider


load_dotenv()


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