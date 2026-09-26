from google.genai.errors import ClientError, ServerError

from core_ai.ai.gemini_provider import GeminiProvider
from core_ai.exceptions import AIProviderError


def test_gemini_retries_server_error(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    provider = GeminiProvider()

    attempts = 0

    def fake_generate_content(*args, **kwargs):
        nonlocal attempts
        attempts += 1

        if attempts < 3:
            raise ServerError(500, {"error": "temporary failure"})

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
        raise ServerError(500, {"error": "server failure"})

    monkeypatch.setattr(
        provider.client.models,
        "generate_content",
        fake_generate_content,
    )

    monkeypatch.setattr(
        "core_ai.ai.retry.time.sleep",
        lambda _: None,
    )

    try:
        provider.generate("test prompt")
    except AIProviderError as exc:
        assert str(exc) == "Gemini provider failed to generate a response"
        assert isinstance(exc.__cause__, ServerError)
    else:
        raise AssertionError("AIProviderError was not raised")


def test_gemini_does_not_retry_client_error(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    provider = GeminiProvider()

    attempts = 0

    def fake_generate_content(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        raise ClientError(400, {"error": "bad request"})

    monkeypatch.setattr(
        provider.client.models,
        "generate_content",
        fake_generate_content,
    )

    try:
        provider.generate("test prompt")
    except AIProviderError as exc:
        assert str(exc) == "Gemini provider failed to generate a response"
        assert isinstance(exc.__cause__, ClientError)
    else:
        raise AssertionError("AIProviderError was not raised")

    assert attempts == 1