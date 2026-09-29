from pathlib import Path

from core_ai.ai.change_generator import ChangeGenerator
from core_ai.ai.context_builder import ContextBuilder
from core_ai.ai.prompt_builder import DocumentationPromptBuilder
from core_ai.ai.service import AIService
from core_ai.ai.structured_output import StructuredOutputParser
from core_ai.exceptions import AIProviderError, PipelineError
from core_ai.pipeline import CorePipeline


class FakeAIProvider:
    def generate(self, prompt: str) -> str:
        return """
{
    "files": [
        {
            "path": "sample.py",
            "changes": [
                {
                    "type": "docstring",
                    "target": "calculate_discount",
                    "content": "Calculate the discount for a purchase."
                }
            ]
        }
    ],
    "readme": "# Sample Project"
}
"""


class FailingAIProvider:
    def generate(self, prompt: str) -> str:
        raise AIProviderError("Provider failed")


class InvalidThenValidAIProvider:
    def __init__(self) -> None:
        self.calls = 0

    def generate(self, prompt: str) -> str:
        self.calls += 1

        if self.calls == 1:
            return "not valid json"

        return """
{
    "files": [
        {
            "path": "sample.py",
            "changes": [
                {
                    "type": "docstring",
                    "target": "calculate_discount",
                    "content": "Calculate the discount for a purchase."
                }
            ]
        }
    ],
    "readme": "# Sample Project"
}
"""


class AlwaysInvalidAIProvider:
    def __init__(self) -> None:
        self.calls = 0

    def generate(self, prompt: str) -> str:
        self.calls += 1
        return "not valid json"


def test_ai_service_retries_once_when_structured_output_is_invalid() -> None:
    provider = InvalidThenValidAIProvider()

    ai_service = AIService(
        provider=provider,
        context_builder=ContextBuilder(),
        prompt_builder=DocumentationPromptBuilder(),
        output_parser=StructuredOutputParser(),
        change_generator=ChangeGenerator(),
    )

    pipeline = CorePipeline(ai_service=ai_service)

    result = pipeline.run(
        repository_path="core_ai/demo_project",
        repository_name="demo_project",
    )

    assert result.ai_result is not None
    assert result.ai_result.documentation.files
    assert provider.calls == 2


def test_ai_service_raises_after_second_invalid_response() -> None:
    provider = AlwaysInvalidAIProvider()

    ai_service = AIService(
        provider=provider,
        context_builder=ContextBuilder(),
        prompt_builder=DocumentationPromptBuilder(),
        output_parser=StructuredOutputParser(),
        change_generator=ChangeGenerator(),
    )

    pipeline = CorePipeline(ai_service=ai_service)

    try:
        pipeline.run(
            repository_path="core_ai/demo_project",
            repository_name="demo_project",
        )
    except PipelineError as exc:
        assert str(exc) == "Core AI pipeline failed"
        assert provider.calls == 2
    else:
        raise AssertionError("PipelineError was not raised")


def create_ai_service():
    return AIService(
        provider=FakeAIProvider(),
        context_builder=ContextBuilder(),
        prompt_builder=DocumentationPromptBuilder(),
        output_parser=StructuredOutputParser(),
        change_generator=ChangeGenerator(),
    )


def test_pipeline_runs_without_ai():
    pipeline = CorePipeline()

    result = pipeline.run(
        repository_path="core_ai/demo_project",
        repository_name="demo_project",
    )

    assert result is not None
    assert result.files
    assert result.analysis is not None
    assert result.documentation_check is not None
    assert result.security is not None
    assert result.sanitized_files
    assert result.ai_input is not None
    assert result.ai_result is None


def test_pipeline_runs_with_fake_ai():
    pipeline = CorePipeline(ai_service=create_ai_service())

    result = pipeline.run(
        repository_path="core_ai/demo_project",
        repository_name="demo_project",
    )

    assert result is not None
    assert result.ai_result is not None
    assert result.ai_result.documentation is not None
    assert result.ai_result.changes is not None


def test_ai_provider_error_becomes_pipeline_error():
    pipeline = CorePipeline(
        ai_service=AIService(
            provider=FailingAIProvider(),
            context_builder=ContextBuilder(),
            prompt_builder=DocumentationPromptBuilder(),
            output_parser=StructuredOutputParser(),
            change_generator=ChangeGenerator(),
        )
    )

    try:
        pipeline.run(
            repository_path="core_ai/demo_project",
            repository_name="demo_project",
        )
    except PipelineError as exc:
        assert str(exc) == "Core AI pipeline failed"
        assert isinstance(exc.__cause__, AIProviderError)
        assert str(exc.__cause__) == "Provider failed"
    else:
        raise AssertionError("PipelineError was not raised")


def test_pipeline_creates_batches(tmp_path: Path) -> None:
    """The pipeline should batch sanitized files before AI generation."""
    repository = tmp_path / "repository"
    repository.mkdir()

    (repository / "a.py").write_text(
        "def first():\n    return 1\n",
        encoding="utf-8",
    )
    (repository / "b.py").write_text(
        "def second():\n    return 2\n",
        encoding="utf-8",
    )

    pipeline = CorePipeline(max_batch_bytes=10)

    result = pipeline.run(str(repository), "test-repository")

    assert len(result.batches) == 2
    assert [batch.batch_id for batch in result.batches] == [1, 2]
    assert [file.path for batch in result.batches for file in batch.files] == [
        "a.py",
        "b.py",
    ]


def test_pipeline_processes_each_batch_independently(tmp_path: Path) -> None:
    """The pipeline should generate and report one result per batch."""
    repository = tmp_path / "repository"
    repository.mkdir()

    (repository / "a.py").write_text(
        "def first():\n    return 1\n",
        encoding="utf-8",
    )
    (repository / "b.py").write_text(
        "def second():\n    return 2\n",
        encoding="utf-8",
    )

    class BatchAwareProvider:
        def generate(self, prompt: str) -> str:
            if "a.py" in prompt:
                return """
{
    "files": [
        {
            "path": "a.py",
            "changes": [
                {
                    "type": "docstring",
                    "target": "first",
                    "content": "Document first."
                }
            ]
        }
    ],
    "readme": null
}
"""

            return """
{
    "files": [
        {
            "path": "b.py",
            "changes": [
                {
                    "type": "docstring",
                    "target": "second",
                    "content": "Document second."
                }
            ]
        }
    ],
    "readme": null
}
"""

    ai_service = AIService(
        provider=BatchAwareProvider(),
        context_builder=ContextBuilder(),
        prompt_builder=DocumentationPromptBuilder(),
        output_parser=StructuredOutputParser(),
        change_generator=ChangeGenerator(),
    )

    completed_batches = []

    def handle_batch(
        batch_id: int,
        total_batches: int,
        result,
    ) -> None:
        completed_batches.append(
            (
                batch_id,
                total_batches,
                [file.path for file in result.documentation.files],
            )
        )

    pipeline = CorePipeline(
        ai_service=ai_service,
        max_batch_bytes=10,
        batch_result_handler=handle_batch,
    )

    result = pipeline.run(
        str(repository),
        "test-repository",
    )

    assert len(completed_batches) == 2

    assert completed_batches == [
        (1, 2, ["a.py"]),
        (2, 2, ["b.py"]),
    ]

    assert result.ai_result is not None

    assert [file.path for file in result.ai_result.documentation.files] == [
        "a.py",
        "b.py",
    ]

    assert [change.file for change in result.ai_result.changes] == [
        "a.py",
        "b.py",
    ]
