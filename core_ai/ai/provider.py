"""AI provider abstraction for documentation generation."""

from abc import ABC, abstractmethod


class AIProvider(ABC):
    """Abstract interface implemented by all AI providers."""

    @abstractmethod
    def generate(self, prompt: str) -> str:
        """Generate a response from the supplied prompt.

        Args:
            prompt: Prompt sent to the AI provider.

        Returns:
            The provider's generated response as a string.

        Raises:
            Exception: Provider-specific exceptions may be raised by
                concrete implementations.
        """
        pass