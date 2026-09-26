import json
from pydantic import ValidationError
from ..models.documentation import DocumentationResult

"""Parse and validate structured AI documentation output."""

class StructuredOutputParser:
    """Parse AI responses into validated documentation results."""

    def parse(self, response: str) -> DocumentationResult:
        """Parse and validate an AI-generated documentation response.

        Args:
            response: Raw response returned by the AI provider.

        Returns:
            A validated DocumentationResult.

        Raises:
            ValueError: If the response is not valid JSON or does not match
                the expected DocumentationResult schema.
        """

        response = response.strip()

        # Remove Markdown code fences if the AI adds them.
        if response.startswith("```"):
            lines = response.splitlines()

            if lines[0].startswith("```"):
                lines = lines[1:]

            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]

            response = "\n".join(lines).strip()

        try:
            data = json.loads(response)

        except json.JSONDecodeError as exc:
            raise ValueError(
                "AI response is not valid JSON"
            ) from exc

        try:
            return DocumentationResult.model_validate(data)

        except ValidationError as exc:
            raise ValueError(
                "AI response does not match DocumentationResult schema"
            ) from exc