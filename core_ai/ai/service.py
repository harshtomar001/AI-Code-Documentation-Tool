"""Coordinate AI documentation generation and source-change creation."""

from ..exceptions import AIProviderError
from ..models.documentation import DocumentationResult
from ..models.input import AIInput
from ..models.results import AIResult
from .change_generator import ChangeGenerator
from .context_builder import ContextBuilder
from .prompt_builder import DocumentationPromptBuilder
from .provider import AIProvider
from .structured_output import StructuredOutputParser


class AIService:
    """Coordinate the AI documentation-generation workflow."""

    def __init__(
        self,
        provider: AIProvider,
        context_builder: ContextBuilder,
        prompt_builder: DocumentationPromptBuilder,
        output_parser: StructuredOutputParser,
        change_generator: ChangeGenerator,
    ):
        """Initialize the AI documentation service.

        Args:
            provider: AI provider used to generate documentation.
            context_builder: Builds structured repository context.
            prompt_builder: Builds the final AI prompt.
            output_parser: Parses and validates the AI response.
            change_generator: Converts documentation into source changes.
        """
        self.provider = provider
        self.context_builder = context_builder
        self.prompt_builder = prompt_builder
        self.output_parser = output_parser
        self.change_generator = change_generator

    def generate_batch(
        self,
        data: AIInput,
        files,
    ) -> DocumentationResult:
        """Generate documentation for one sanitized file batch."""
        batch_data = data.model_copy(
            update={"files": files},
        )

        context = self.context_builder.build(batch_data)
        prompt = self.prompt_builder.build(context)

        try:
            response = self.provider.generate(prompt)
        except AIProviderError:
            raise

        return self.output_parser.parse(response)

    def generate_batch_result(
        self,
        data: AIInput,
        files,
    ) -> AIResult:
        """Generate documentation and source changes for one file batch."""
        batch_paths = {file.path for file in files}

        batch_analysis = data.analysis.model_copy(
            update={
                "files": [
                    analysis_file
                    for analysis_file in data.analysis.files
                    if analysis_file.path in batch_paths
                ]
            }
        )

        batch_repository = data.repository.model_copy(
            update={
                "files": [path for path in data.repository.files if path in batch_paths]
            }
        )

        batch_data = data.model_copy(
            update={
                "repository": batch_repository,
                "analysis": batch_analysis,
                "files": files,
            }
        )

        context = self.context_builder.build(batch_data)
        prompt = self.prompt_builder.build(context)

        try:
            response = self.provider.generate(prompt)
        except AIProviderError:
            raise

        documentation = self.output_parser.parse(response)

        changes = self.change_generator.generate(
            documentation,
            batch_analysis,
            files,
        )

        return AIResult(
            documentation=documentation,
            changes=changes,
        )

    def generate_documentation(self, data: AIInput) -> AIResult:
        """Generate documentation and corresponding source changes.

        Args:
            data: Sanitized repository analysis input.

        Returns:
            AIResult containing generated documentation and source changes.

        Raises:
            AIProviderError: If the configured AI provider fails.
        """
        context = self.context_builder.build(data)
        prompt = self.prompt_builder.build(context)

        try:
            response = self.provider.generate(prompt)
        except AIProviderError:
            raise

        documentation = self.output_parser.parse(response)

        changes = self.change_generator.generate(
            documentation,
            data.analysis,
            data.files,
        )

        return AIResult(
            documentation=documentation,
            changes=changes,
        )
