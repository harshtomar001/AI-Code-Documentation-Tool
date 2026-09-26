import pytest

from core_ai.ai.structured_output import StructuredOutputParser


def test_parser_accepts_valid_json():
    parser = StructuredOutputParser()

    response = """
    {
        "files": [
            {
                "path": "example.py",
                "changes": [
                    {
                        "type": "docstring",
                        "target": "calculate_discount",
                        "content": "Calculate the final discounted price."
                    }
                ]
            }
        ],
        "readme": "Example README"
    }
    """

    result = parser.parse(response)

    assert len(result.files) == 1
    assert result.files[0].path == "example.py"
    assert result.files[0].changes[0].type == "docstring"
    assert result.files[0].changes[0].target == "calculate_discount"
    assert result.readme == "Example README"


def test_parser_accepts_markdown_code_fence():
    parser = StructuredOutputParser()

    response = """```json
{
    "files": [],
    "readme": null
}
```"""

    result = parser.parse(response)

    assert result.files == []
    assert result.readme is None


def test_parser_rejects_invalid_json():
    parser = StructuredOutputParser()

    with pytest.raises(
        ValueError,
        match="AI response is not valid JSON",
    ):
        parser.parse("{invalid json}")


def test_parser_rejects_invalid_change_type():
    parser = StructuredOutputParser()

    response = """
    {
        "files": [
            {
                "path": "example.py",
                "changes": [
                    {
                        "type": "function",
                        "target": "test",
                        "content": "Invalid change type"
                    }
                ]
            }
        ]
    }
    """

    with pytest.raises(
        ValueError,
        match="AI response does not match DocumentationResult schema",
    ):
        parser.parse(response)


def test_parser_rejects_missing_required_change_fields():
    parser = StructuredOutputParser()

    response = """
    {
        "files": [
            {
                "path": "example.py",
                "changes": [
                    {
                        "type": "docstring",
                        "content": "Missing target"
                    }
                ]
            }
        ]
    }
    """

    with pytest.raises(
        ValueError,
        match="AI response does not match DocumentationResult schema",
    ):
        parser.parse(response)


def test_parser_uses_empty_defaults():
    parser = StructuredOutputParser()

    result = parser.parse("{}")

    assert result.files == []
    assert result.readme is None