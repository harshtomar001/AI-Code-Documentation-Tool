import pytest

from core_ai.config import validate_environment


def test_gemini_provider_requires_api_key(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(
        ValueError,
        match="GEMINI_API_KEY is required",
    ):
        validate_environment()


def test_openrouter_provider_requires_api_key(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openrouter")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    with pytest.raises(
        ValueError,
        match="OPENROUTER_API_KEY is required",
    ):
        validate_environment()


def test_unsupported_provider_is_rejected(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "unknown")

    with pytest.raises(
        ValueError,
        match="Unsupported AI_PROVIDER",
    ):
        validate_environment()


def test_gemini_provider_with_key_passes(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    validate_environment()