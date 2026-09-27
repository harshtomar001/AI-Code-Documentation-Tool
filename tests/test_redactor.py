from core_ai.models.scanner import SourceFile
from core_ai.security_scanner import SecurityScanner
from core_ai.redactor import Redactor


def test_redactor_removes_detected_secret():
    source = SourceFile(
        path="config.py",
        language="python",
        content='API_KEY = "super-secret-key"'
    )

    scanner = SecurityScanner()
    matches = scanner.scan([source])

    redactor = Redactor()
    result = redactor.redact([source], matches)

    assert result
    assert "super-secret-key" not in result[0].content


def test_redactor_preserves_non_sensitive_code():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="x = 10\ny = 20\nresult = x + y"
    )

    scanner = SecurityScanner()
    matches = scanner.scan([source])

    redactor = Redactor()
    result = redactor.redact([source], matches)

    assert result[0].content == source.content
