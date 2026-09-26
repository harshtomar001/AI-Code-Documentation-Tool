import pytest

from core_ai.ai.provider_factory import ProviderFactory


def test_factory_creates_gemini(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")

    class FakeGemini:
        pass

    monkeypatch.setattr(
        "core_ai.ai.provider_factory.GeminiProvider",
        FakeGemini,
    )

    provider = ProviderFactory.create()

    assert isinstance(provider, FakeGemini)


def test_factory_creates_openrouter(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openrouter")

    class FakeOpenRouter:
        pass

    monkeypatch.setattr(
        "core_ai.ai.provider_factory.OpenRouterProvider",
        FakeOpenRouter,
    )

    provider = ProviderFactory.create()

    assert isinstance(provider, FakeOpenRouter)


def test_factory_is_case_insensitive(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "GeMiNi")

    class FakeGemini:
        pass

    monkeypatch.setattr(
        "core_ai.ai.provider_factory.GeminiProvider",
        FakeGemini,
    )

    provider = ProviderFactory.create()

    assert isinstance(provider, FakeGemini)


def test_factory_rejects_unsupported_provider(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "unknown")

    with pytest.raises(
        ValueError,
        match="Unsupported AI provider: unknown",
    ):
        ProviderFactory.create()
