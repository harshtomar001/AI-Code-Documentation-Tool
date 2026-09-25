from core_ai.ai.change_generator import ChangeGenerator
from core_ai.ai.context_builder import ContextBuilder
from core_ai.ai.prompt_builder import DocumentationPromptBuilder
from core_ai.ai.service import AIService
from core_ai.ai.structured_output import StructuredOutputParser
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
    pipeline = CorePipeline(
        ai_service=create_ai_service()
    )

    result = pipeline.run(
        repository_path="core_ai/demo_project",
        repository_name="demo_project",
    )

    assert result is not None
    assert result.ai_result is not None
    assert result.ai_result.documentation is not None
    assert result.ai_result.changes is not None
