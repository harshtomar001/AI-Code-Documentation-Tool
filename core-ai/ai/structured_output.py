import json

from pydantic import ValidationError
from models.documentation import DocumentationResult


class StructuredOutputParser:

    def parse(self, response: str) -> DocumentationResult:

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