import pytest

from core_ai.ai.openrouter_provider import OpenRouterProvider
from core_ai.exceptions import AIProviderError


class FakeMessage:
    def __init__(self, content):
        self.content = content


class FakeChoice:
    def __init__(self, content):
        self.message = FakeMessage(content)


class FakeResponse:
    def __init__(self, content):
        self.choices = [FakeChoice(content)]


class FakeCompletions:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error

    def create(self, **kwargs):
        if self.error:
            raise self.error
        return self.response


class FakeChat:
    def __init__(self, completions):
        self.completions = completions


class FakeClient:
    def __init__(self, response=None, error=None):
        self.chat = FakeChat(FakeCompletions(response=response, error=error))


def test_openrouter_requires_api_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    with pytest.raises(
        ValueError,
        match="OPENROUTER_API_KEY is not configured",
    ):
        OpenRouterProvider()


def test_openrouter_generates_response(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    fake_client = FakeClient(response=FakeResponse("generated documentation"))

    monkeypatch.setattr(
        "core_ai.ai.openrouter_provider.OpenAI",
        lambda **kwargs: fake_client,
    )

    provider = OpenRouterProvider()

    result = provider.generate("test prompt")

    assert result == "generated documentation"


def test_openrouter_empty_response(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    fake_client = FakeClient(response=FakeResponse(None))

    monkeypatch.setattr(
        "core_ai.ai.openrouter_provider.OpenAI",
        lambda **kwargs: fake_client,
    )

    provider = OpenRouterProvider()

    with pytest.raises(
        AIProviderError,
        match="OpenRouter returned an empty response",
    ):
        provider.generate("test prompt")


def test_openrouter_provider_error(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    fake_client = FakeClient(error=RuntimeError("temporary failure"))

    monkeypatch.setattr(
        "core_ai.ai.openrouter_provider.OpenAI",
        lambda **kwargs: fake_client,
    )

    provider = OpenRouterProvider()

    with pytest.raises(
        AIProviderError,
        match="OpenRouter provider failed to generate a response",
    ):
        provider.generate("test prompt")
