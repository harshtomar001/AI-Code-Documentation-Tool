import re

from core_ai.models.scanner import SourceFile
from core_ai.models.security import SecurityResult
from core_ai.security_scanner import SecurityScanner


def test_security_scanner_accepts_custom_patterns():
    custom_patterns = [
        (
            "secret",
            "internal_token",
            re.compile(r"INTERNAL_TOKEN=([A-Za-z0-9]+)"),
            "[REDACTED_INTERNAL_TOKEN]",
        )
    ]

    source = SourceFile(
        path="config.py",
        language="python",
        content="INTERNAL_TOKEN=mycustomtoken123",
    )

    matches = SecurityScanner(patterns=custom_patterns).scan([source])

    assert len(matches) == 1
    assert matches[0].category == "internal_token"
    assert matches[0].replacement == "[REDACTED_INTERNAL_TOKEN]"


def test_security_scanner_uses_default_patterns():
    source = SourceFile(
        path="config.py",
        language="python",
        content='API_KEY = "super-secret-key"',
    )

    matches = SecurityScanner().scan([source])

    assert any(match.category == "api_key" for match in matches)


def test_security_result_is_unsafe_when_findings_exist():
    result = SecurityResult(
        findings=[
            {
                "type": "secret",
                "category": "api_key",
                "file": "config.py",
                "line": 1,
                "redacted": True,
            }
        ]
    )

    assert result.safe_for_ai is False


def test_security_result_is_safe_when_no_findings_exist():
    result = SecurityResult()

    assert result.safe_for_ai is True


def test_security_scanner_detects_secret():
    source = SourceFile(
        path="config.py",
        language="python",
        content='API_KEY = "super-secret-key"',
    )

    scanner = SecurityScanner()
    matches = scanner.scan([source])

    assert len(matches) >= 1
    assert any(match.type == "secret" for match in matches)


def test_security_scanner_does_not_flag_normal_code():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="x = 10\ny = 20\nresult = x + y",
    )

    scanner = SecurityScanner()
    matches = scanner.scan([source])

    assert len(matches) == 0


def test_security_scanner_handles_non_key_value_pattern():
    source = SourceFile(
        path="keys.txt",
        language="text",
        content="-----BEGIN RSA PRIVATE KEY-----",
    )

    scanner = SecurityScanner()
    matches = scanner.scan([source])

    private_key_matches = [
        match for match in matches if match.category == "private_key"
    ]

    assert len(private_key_matches) == 1
    assert private_key_matches[0].start == 0
    assert private_key_matches[0].end == len("-----BEGIN RSA PRIVATE KEY-----")


def test_security_scanner_detects_google_api_key():
    google_key = "AIza" + "A" * 35

    source = SourceFile(
        path="config.py",
        language="python",
        content=f'GEMINI_API_KEY = "{google_key}"',
    )

    matches = SecurityScanner().scan([source])

    assert any(match.category == "google_api_key" for match in matches)


def test_security_scanner_detects_github_token():
    source = SourceFile(
        path="config.py",
        language="python",
        content='TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz123456"',
    )

    matches = SecurityScanner().scan([source])

    assert any(match.category == "github_token" for match in matches)


def test_security_scanner_detects_aws_access_key():
    source = SourceFile(
        path="config.py",
        language="python",
        content='AWS_KEY = "AKIAIOSFODNN7EXAMPLE"',
    )

    matches = SecurityScanner().scan([source])

    assert any(match.category == "aws_access_key" for match in matches)


def test_security_scanner_detects_high_entropy_string():
    source = SourceFile(
        path="config.py",
        language="python",
        content='TOKEN = "xK9mP2qL7vR4sT8wY1nC6zH3"',
    )

    matches = SecurityScanner().scan([source])

    assert any(match.category == "high_entropy" for match in matches)


def test_security_scanner_does_not_flag_low_entropy_string():
    source = SourceFile(
        path="sample.py",
        language="python",
        content='message = "aaaaaaaaaaaaaaaaaaaaaaaa"',
    )

    matches = SecurityScanner().scan([source])

    assert not any(match.category == "high_entropy" for match in matches)
