import pytest

from core_ai.config import load_environment, validate_environment


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


def test_load_environment_uses_project_env_file(monkeypatch):
    captured = {}

    def fake_load_dotenv(path):
        captured["path"] = path

    monkeypatch.setattr(
        "core_ai.config.load_dotenv",
        fake_load_dotenv,
    )

    load_environment()

    assert captured["path"].name == ".env"
