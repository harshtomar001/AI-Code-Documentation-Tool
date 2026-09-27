from ..models.input import AIInput
from ..models.results import AIResult

from .change_generator import ChangeGenerator
from .context_builder import ContextBuilder
from .prompt_builder import DocumentationPromptBuilder
from .provider import AIProvider
from .structured_output import StructuredOutputParser


class AIService:

    def __init__(
        self,
        provider: AIProvider,
        context_builder: ContextBuilder,
        prompt_builder: DocumentationPromptBuilder,
        output_parser: StructuredOutputParser,
        change_generator: ChangeGenerator
    ):
        self.provider = provider
        self.context_builder = context_builder
        self.prompt_builder = prompt_builder
        self.output_parser = output_parser
        self.change_generator = change_generator

    def generate_documentation(
        self,
        data: AIInput
    ) -> AIResult:

        context = self.context_builder.build(data)

        prompt = self.prompt_builder.build(context)

        response = self.provider.generate(prompt)

        documentation = self.output_parser.parse(response)

        changes = self.change_generator.generate(
            documentation,
            data.analysis,
            data.files
        )

        return AIResult(
            documentation=documentation,
            changes=changes
        )