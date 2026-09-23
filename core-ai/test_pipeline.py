import tempfile
from pathlib import Path

from pipeline import CorePipeline
from ai.provider import AIProvider
from ai.context_builder import ContextBuilder
from ai.prompt_builder import DocumentationPromptBuilder
from ai.structured_output import StructuredOutputParser
from ai.change_generator import ChangeGenerator
from ai.service import AIService


class FakeAIProvider(AIProvider):

    def generate(self, prompt: str) -> str:

        # Make sure the secret was never included in the prompt.
        assert "super-secret-key" not in prompt

        return """
{
    "files": [
        {
            "path": "app.py",
            "changes": [
                {
                    "type": "docstring",
                    "target": "calculate_discount",
                    "content": "Calculate the discounted price based on premium status."
                }
            ]
        }
    ],
    "readme": "# Test Project\\n\\nGenerated documentation."
}
"""


def main():

    with tempfile.TemporaryDirectory() as temp_dir:

        root = Path(temp_dir)

        source_file = root / "app.py"

        source_file.write_text(
            '''
API_KEY = "super-secret-key"

def calculate_discount(price, premium):
    """
    Calculate discount.

    price: original price
    """
    if premium:
        return price * 0.8

    return price
''',
            encoding="utf-8",
        )

        # -------------------------------------------------
        # Use a fake provider so the test does not require
        # Gemini/OpenRouter credentials or network access.
        # -------------------------------------------------

        provider = FakeAIProvider()

        ai_service = AIService(
            provider=provider,
            context_builder=ContextBuilder(),
            prompt_builder=DocumentationPromptBuilder(),
            output_parser=StructuredOutputParser(),
            change_generator=ChangeGenerator(),
        )

        pipeline = CorePipeline(
            ai_service=ai_service
        )

        result = pipeline.run(
            str(root),
            repository_name="test-project",
        )

        print("\n--- SCANNED FILES ---")

        for file in result.files:
            print(file.path)

        print("\n--- DOCUMENTATION ISSUES ---")

        for issue in result.documentation_check.issues:
            print(issue.target, "|", issue.issue)

        print("\n--- STALE DOCUMENTATION ---")

        for issue in result.stale_documentation.issues:
            print(issue.target, "|", issue.details)

        print("\n--- SECURITY FINDINGS ---")

        for finding in result.security.findings:
            print(
                finding.category,
                "|",
                finding.file,
                "| line",
                finding.line,
            )

        print("\n--- SANITIZED SOURCE ---")

        for file in result.sanitized_files:
            print(file.content)

        print("\n--- AI INPUT ---")

        print(result.ai_input.repository.name)

        print(
            "Files:",
            len(result.ai_input.files)
        )

        print("\n--- AI RESULT ---")

        print(result.ai_result)

        # -------------------------------------------------
        # Security assertions
        # -------------------------------------------------

        sanitized_content = result.sanitized_files[0].content

        assert "super-secret-key" not in sanitized_content
        assert "[REDACTED_API_KEY]" in sanitized_content

        ai_content = "\n".join(
            file.content
            for file in result.ai_input.files
        )

        assert "super-secret-key" not in ai_content

        # -------------------------------------------------
        # AI generation assertions
        # -------------------------------------------------

        assert result.ai_result is not None
        assert result.ai_result.documentation.files
        assert result.ai_result.changes

        change = result.ai_result.changes[0]

        assert change.file == "app.py"
        assert change.target == "calculate_discount"
        assert change.type == "docstring"

        print(
            "\nPASS: secret never reached AI input"
        )

        print(
            "PASS: AI documentation generation and "
            "change generation succeeded"
        )


if __name__ == "__main__":
    main()