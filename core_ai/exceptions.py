"""Custom exceptions used by the Core AI pipeline."""


class AIProviderError(Exception):
    """Raised when an AI provider fails to generate a response."""


class PipelineError(Exception):
    """Raised when the Core AI pipeline fails during execution."""