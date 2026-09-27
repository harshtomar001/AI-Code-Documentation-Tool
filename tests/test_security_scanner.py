from core_ai.models.scanner import SourceFile
from core_ai.security_scanner import SecurityScanner


def test_security_scanner_detects_secret():
    source = SourceFile(
        path="config.py",
        language="python",
        content='API_KEY = "super-secret-key"'
    )

    scanner = SecurityScanner()
    matches = scanner.scan([source])

    assert len(matches) >= 1
    assert any(match.type == "secret" for match in matches)


def test_security_scanner_does_not_flag_normal_code():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="x = 10\ny = 20\nresult = x + y"
    )

    scanner = SecurityScanner()
    matches = scanner.scan([source])

    assert len(matches) == 0
