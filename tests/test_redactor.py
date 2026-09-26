from core_ai.models.scanner import SourceFile
from core_ai.models.security import SecurityMatch
from core_ai.redactor import Redactor
from core_ai.security_scanner import SecurityScanner


def test_redactor_removes_detected_secret():
    source = SourceFile(
        path="config.py",
        language="python",
        content='API_KEY = "super-secret-key"',
    )

    matches = SecurityScanner().scan([source])
    result = Redactor().redact([source], matches)

    assert result
    assert "super-secret-key" not in result[0].content


def test_redactor_preserves_non_sensitive_code():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="x = 10\ny = 20\nresult = x + y",
    )

    matches = SecurityScanner().scan([source])
    result = Redactor().redact([source], matches)

    assert result[0].content == source.content


def test_redactor_removes_multiple_secrets():
    source = SourceFile(
        path="config.py",
        language="python",
        content=(
            'API_KEY = "first-secret"\n'
            'PASSWORD = "second-secret"\n'
            'TOKEN = "third-secret"'
        ),
    )

    matches = SecurityScanner().scan([source])
    result = Redactor().redact([source], matches)

    content = result[0].content

    assert "first-secret" not in content
    assert "second-secret" not in content
    assert "third-secret" not in content
    assert "[REDACTED_" in content


def test_redactor_removes_multiple_occurrences():
    source = SourceFile(
        path="config.py",
        language="python",
        content=('API_KEY = "same-secret"\nAPI_KEY = "same-secret"'),
    )

    matches = SecurityScanner().scan([source])
    result = Redactor().redact([source], matches)

    content = result[0].content

    assert content.count("same-secret") == 0
    assert content.count("[REDACTED_") == 2


def test_redactor_preserves_surrounding_code():
    source = SourceFile(
        path="sample.py",
        language="python",
        content=('before = 1\nAPI_KEY = "secret-value"\nafter = 2\n'),
    )

    matches = SecurityScanner().scan([source])
    result = Redactor().redact([source], matches)

    content = result[0].content

    assert content.startswith("before = 1\nAPI_KEY = ")
    assert content.endswith("after = 2\n")
    assert "secret-value" not in content
    assert "[REDACTED_" in content


def test_redactor_redacts_secret_and_pii_together():
    source = SourceFile(
        path="config.py",
        language="python",
        content=(
            'API_KEY = "secret-value"\n'
            'EMAIL = "developer@example.com"\n'
            'PHONE = "9876543210"'
        ),
    )

    matches = SecurityScanner().scan([source])
    result = Redactor().redact([source], matches)

    content = result[0].content

    assert "secret-value" not in content
    assert "developer@example.com" not in content
    assert "9876543210" not in content
    assert "[REDACTED_" in content


def test_redactor_ignores_overlapping_matches():
    source = SourceFile(
        path="config.py",
        language="python",
        content="abcdefghij",
    )

    matches = [
        SecurityMatch(
            type="secret",
            category="first",
            file="config.py",
            line=1,
            start=2,
            end=7,
            replacement="[FIRST]",
        ),
        SecurityMatch(
            type="secret",
            category="overlap",
            file="config.py",
            line=1,
            start=5,
            end=9,
            replacement="[OVERLAP]",
        ),
    ]

    result = Redactor().redact([source], matches)

    assert result[0].content == "ab[FIRST]hij"


def test_redactor_ignores_invalid_ranges():
    source = SourceFile(
        path="config.py",
        language="python",
        content="abcdefghij",
    )

    matches = [
        SecurityMatch(
            type="secret",
            category="invalid",
            file="config.py",
            line=1,
            start=-1,
            end=4,
            replacement="[INVALID]",
        ),
        SecurityMatch(
            type="secret",
            category="invalid",
            file="config.py",
            line=1,
            start=8,
            end=20,
            replacement="[INVALID]",
        ),
    ]

    result = Redactor().redact([source], matches)

    assert result[0].content == source.content


def test_redactor_keeps_files_without_matches():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="print('hello')",
    )

    result = Redactor().redact([source], [])

    assert result[0].path == "sample.py"
    assert result[0].content == "print('hello')"
