import pytest
from google.genai.errors import ClientError, ServerError

from core_ai.ai.gemini_provider import GeminiProvider
from core_ai.exceptions import AIProviderError


def test_gemini_requires_api_key(monkeypatch):
    monkeypatch.delenv(
        "GEMINI_API_KEY",
        raising=False,
    )

    with pytest.raises(
        ValueError,
        match="GEMINI_API_KEY is not configured",
    ):
        GeminiProvider()


def test_gemini_retries_server_error(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    provider = GeminiProvider()

    attempts = 0

    def fake_generate_content(*args, **kwargs):
        nonlocal attempts
        attempts += 1

        if attempts < 3:
            raise ServerError(
                500,
                {"error": "temporary failure"},
            )

        class Response:
            text = "generated documentation"

        return Response()

    monkeypatch.setattr(
        provider.client.models,
        "generate_content",
        fake_generate_content,
    )

    monkeypatch.setattr(
        "core_ai.ai.retry.time.sleep",
        lambda _: None,
    )

    result = provider.generate("test prompt")

    assert result == "generated documentation"
    assert attempts == 3


def test_gemini_server_error_becomes_ai_provider_error(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    provider = GeminiProvider()

    def fake_generate_content(*args, **kwargs):
        raise ServerError(
            500,
            {"error": "server failure"},
        )

    monkeypatch.setattr(
        provider.client.models,
        "generate_content",
        fake_generate_content,
    )

    monkeypatch.setattr(
        "core_ai.ai.retry.time.sleep",
        lambda _: None,
    )

    with pytest.raises(
        AIProviderError,
        match="Gemini provider failed",
    ):
        provider.generate("test prompt")


def test_gemini_does_not_retry_client_error(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    provider = GeminiProvider()

    attempts = 0

    def fake_generate_content(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        raise ClientError(
            400,
            {"error": "bad request"},
        )

    monkeypatch.setattr(
        provider.client.models,
        "generate_content",
        fake_generate_content,
    )

    with pytest.raises(
        AIProviderError,
        match="Gemini provider failed",
    ):
        provider.generate("test prompt")

    assert attempts == 1


def test_gemini_empty_response(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    provider = GeminiProvider()

    class Response:
        text = None

    monkeypatch.setattr(
        provider.client.models,
        "generate_content",
        lambda *args, **kwargs: Response(),
    )

    with pytest.raises(
        AIProviderError,
        match="Gemini returned an empty response",
    ):
        provider.generate("test prompt")


def test_gemini_reraises_existing_ai_provider_error(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    provider = GeminiProvider()

    error = AIProviderError("already classified")

    def fake_generate_content(*args, **kwargs):
        raise error

    monkeypatch.setattr(
        provider.client.models,
        "generate_content",
        fake_generate_content,
    )

    with pytest.raises(AIProviderError) as exc_info:
        provider.generate("test prompt")

    assert exc_info.value is error
