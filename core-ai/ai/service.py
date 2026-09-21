from models.input import AIInput
from ai.context_builder import ContextBuilder
from ai.prompt_builder import DocumentationPromptBuilder
from ai.provider import AIProvider


class AIService:

    def __init__(
        self,
        provider: AIProvider,
        context_builder: ContextBuilder,
        prompt_builder: DocumentationPromptBuilder
    ):
        self.provider = provider
        self.context_builder = context_builder
        self.prompt_builder = prompt_builder

    def generate_documentation(self, data: AIInput) -> str:

        context = self.context_builder.build(data)

        prompt = self.prompt_builder.build(context)

        return self.provider.generate(prompt) #  provider is the llm like gemini_provider or openrouter_provider