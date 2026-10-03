"""Coordinate AI documentation generation and source-change creation."""

import time

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

        print(
            f"[AIService] generate_batch: "
            f"starting context build ({len(files)} files)",
            flush=True,
        )

        context_start = time.perf_counter()
        context = self.context_builder.build(batch_data)
        print(
            f"[AIService] generate_batch: "
            f"context built in {time.perf_counter() - context_start:.2f}s",
            flush=True,
        )

        prompt_start = time.perf_counter()
        prompt = self.prompt_builder.build(context)
        print(
            f"[AIService] generate_batch: "
            f"prompt built in {time.perf_counter() - prompt_start:.2f}s "
            f"(prompt chars={len(prompt)})",
            flush=True,
        )

        print(
            "[AIService] generate_batch: "
            "calling provider.generate()",
            flush=True,
        )

        provider_start = time.perf_counter()

        try:
            response = self.provider.generate(prompt)
        except AIProviderError:
            print(
                f"[AIService] generate_batch: "
                f"provider failed after "
                f"{time.perf_counter() - provider_start:.2f}s",
                flush=True,
            )
            raise

        print(
            f"[AIService] generate_batch: "
            f"provider returned in "
            f"{time.perf_counter() - provider_start:.2f}s "
            f"(response chars={len(response)})",
            flush=True,
        )

        parse_start = time.perf_counter()
        result = self.output_parser.parse(response)



        print(
            f"[AIService] generate_batch: "
            f"response parsed in "
            f"{time.perf_counter() - parse_start:.2f}s",
            flush=True,
        )

        return result

    def generate_batch_result(
        self,
        data: AIInput,
        files,
    ) -> AIResult:
        """Generate documentation and source changes for one file batch."""
        batch_paths = {file.path for file in files}

        print(
            f"[AIService] generate_batch_result: "
            f"START files={len(files)}",
            flush=True,
        )

        def overlaps_target(analysis_file, chunk_file) -> bool:
            """Return whether an AST unit belongs to a source chunk target."""
            if (
                chunk_file.target_start_line is None
                or chunk_file.target_end_line is None
            ):
                if (
                    chunk_file.start_line is None
                    or chunk_file.end_line is None
                ):
                    return True

                target_start = chunk_file.start_line
                target_end = chunk_file.end_line
            else:
                target_start = chunk_file.target_start_line
                target_end = chunk_file.target_end_line

            return (
                analysis_file.line_start <= target_end
                and analysis_file.line_end >= target_start
            )

        def filter_analysis_file(analysis_file):
            """Keep only AST targets belonging to the current source chunk."""
            matching_chunks = [
                file
                for file in files
                if file.path == analysis_file.path
            ]

            if not matching_chunks:
                return None

            functions = [
                function
                for function in analysis_file.functions
                if any(
                    overlaps_target(function, chunk)
                    for chunk in matching_chunks
                )
            ]

            classes = []

            for cls in analysis_file.classes:
                matching_methods = [
                    method
                    for method in cls.methods
                    if any(
                        overlaps_target(method, chunk)
                        for chunk in matching_chunks
                    )
                ]

                if matching_methods:
                    classes.append(
                        cls.model_copy(
                            update={
                                "methods": matching_methods,
                            }
                        )
                    )
                    continue

                if any(
                    not cls.methods
                    and overlaps_target(cls, chunk)
                    for chunk in matching_chunks
                ):
                    classes.append(cls)

            return analysis_file.model_copy(
                update={
                    "functions": functions,
                    "classes": classes,
                }
            )

        batch_analysis_files = []

        for analysis_file in data.analysis.files:
            if analysis_file.path not in batch_paths:
                continue

            filtered_file = filter_analysis_file(analysis_file)

            if filtered_file is None:
                continue

            if (
                filtered_file.functions
                or filtered_file.classes
            ):
                batch_analysis_files.append(filtered_file)

        batch_analysis = data.analysis.model_copy(
            update={
                "files": batch_analysis_files,
            }
        )

        print(
            f"[AIService] generate_batch_result: "
            f"batch analysis files={len(batch_analysis.files)}",
            flush=True,
        )

        batch_repository = data.repository.model_copy(
            update={
                "files": [
                    path
                    for path in data.repository.files
                    if path in batch_paths
                ]
            }
        )

        batch_data = data.model_copy(
            update={
                "repository": batch_repository,
                "analysis": batch_analysis,
                "files": files,
            }
        )

        print(
            "[AIService] generate_batch_result: "
            "building context",
            flush=True,
        )

        context_start = time.perf_counter()
        context = self.context_builder.build(batch_data)

        print(
            f"[AIService] generate_batch_result: "
            f"context built in {time.perf_counter() - context_start:.2f}s",
            flush=True,
        )

        print(
            "[AIService] generate_batch_result: "
            "building prompt",
            flush=True,
        )

        prompt_start = time.perf_counter()
        prompt = self.prompt_builder.build(context)

        print(
            f"[AIService] generate_batch_result: "
            f"prompt built in "
            f"{time.perf_counter() - prompt_start:.2f}s "
            f"(prompt chars={len(prompt)})",
            flush=True,
        )

        print(
            "[AIService] generate_batch_result: "
            "calling provider.generate()",
            flush=True,
        )

        provider_start = time.perf_counter()

        try:
            response = self.provider.generate(prompt)
        except AIProviderError:
            print(
                f"[AIService] generate_batch_result: "
                f"provider failed after "
                f"{time.perf_counter() - provider_start:.2f}s",
                flush=True,
            )
            raise

        print(
            f"[AIService] generate_batch_result: "
            f"provider completed in "
            f"{time.perf_counter() - provider_start:.2f}s "
            f"(response chars={len(response)})",
            flush=True,
        )

        parser_start = time.perf_counter()

        try:
            documentation = self.output_parser.parse(response)
            print(
                f"[AIService] generate_batch_result: "
                f"parsed files={len(documentation.files)} "
                f"documentation_changes={sum(len(file.changes) for file in documentation.files)} "
                f"readme={'yes' if documentation.readme else 'no'}",
                flush=True,
            )
        except ValueError:
            print(
                "[AIService] generate_batch_result: "
                "parser rejected provider response; retrying provider",
                flush=True,
            )

            retry_start = time.perf_counter()
            response = self.provider.generate(prompt)

            print(
                f"[AIService] generate_batch_result: "
                f"retry provider completed in "
                f"{time.perf_counter() - retry_start:.2f}s "
                f"(response chars={len(response)})",
                flush=True,
            )

            documentation = self.output_parser.parse(response)

            print(
                f"[AIService] generate_batch_result: "
                f"parsed files={len(documentation.files)} "
                f"documentation_changes="
                f"{sum(len(file.changes) for file in documentation.files)} "
                f"readme={'yes' if documentation.readme else 'no'}",
                flush=True,
            )

            print(
                f"[AIService] generate_batch_result: "
                f"response parsed in "
                f"{time.perf_counter() - parser_start:.2f}s",
                flush=True,
            )

        # The AI receives only the current chunk, but source changes must be
        # generated against the complete original file.
        original_files = [
            original_file
            for original_file in data.files
            if original_file.path in batch_paths
            and original_file.start_line is None
            and original_file.end_line is None
        ]

        if not original_files:
            original_files = [
                original_file
                for original_file in data.files
                if original_file.path in batch_paths
            ]

        change_start = time.perf_counter()

        changes = self.change_generator.generate(
            documentation,
            batch_analysis,
            original_files,
        )

        print(
            f"[AIService] generate_batch_result: "
            f"source changes generated in "
            f"{time.perf_counter() - change_start:.2f}s "
            f"(changes={len(changes)})",
            flush=True,
        )

        print(
            "[AIService] generate_batch_result: COMPLETE",
            flush=True,
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
        print(
            "[AIService] generate_documentation: "
            "building context",
            flush=True,
        )

        context = self.context_builder.build(data)

        print(
            "[AIService] generate_documentation: "
            "building prompt",
            flush=True,
        )

        prompt = self.prompt_builder.build(context)

        print(
            "[AIService] generate_documentation: "
            "calling provider.generate()",
            flush=True,
        )

        try:
            response = self.provider.generate(prompt)
        except AIProviderError:
            print(
                "[AIService] generate_documentation: "
                "provider failed",
                flush=True,
            )
            raise

        print(
            f"[AIService] generate_documentation: "
            f"provider returned (response chars={len(response)})",
            flush=True,
        )

        documentation = self.output_parser.parse(response)

        print(
            "[AIService] generate_documentation: "
            "response parsed",
            flush=True,
        )

        changes = self.change_generator.generate(
            documentation,
            data.analysis,
            data.files,
        )

        print(
            f"[AIService] generate_documentation: "
            f"source changes generated (changes={len(changes)})",
            flush=True,
        )

        return AIResult(
            documentation=documentation,
            changes=changes,
        )

