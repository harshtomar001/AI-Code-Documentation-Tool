"""Environment configuration for the Core AI package."""

import os
from pathlib import Path

from dotenv import load_dotenv


def load_environment() -> None:
    """Load environment variables from the project's root .env file."""
    project_root = Path(__file__).resolve().parent.parent
    env_path = project_root / ".env"

    load_dotenv(env_path)


def validate_environment() -> None:
    """Validate environment variables required by the selected AI provider.

    Raises:
        ValueError: If the selected provider is unsupported or its
            required API key is missing.
    """
    provider = os.getenv("AI_PROVIDER", "gemini").lower()

    if provider == "gemini":
        if not os.getenv("GEMINI_API_KEY"):
            raise ValueError(
                "GEMINI_API_KEY is required when AI_PROVIDER=gemini"
            )

    elif provider == "openrouter":
        if not os.getenv("OPENROUTER_API_KEY"):
            raise ValueError(
                "OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter"
            )

    else:
        raise ValueError(
            f"Unsupported AI_PROVIDER: {provider}"
        )