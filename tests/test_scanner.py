from pathlib import Path

import pytest

from core_ai.scanner import FileScanner


def test_scanner_finds_python_files():
    scanner = FileScanner()

    project_root = Path(__file__).resolve().parents[1]
    files = scanner.scan(str(project_root))

    assert files, "Scanner should find files in the project"

    python_files = [file for file in files if file.language == "python"]

    assert python_files, "Scanner should find Python files"


def test_scanner_returns_source_file_paths():
    scanner = FileScanner()

    project_root = Path(__file__).resolve().parents[1]
    files = scanner.scan(str(project_root))

    assert all(file.path for file in files)


def test_scanner_rejects_missing_repository():
    scanner = FileScanner()

    with pytest.raises(
        FileNotFoundError,
        match="Repository does not exist",
    ):
        scanner.scan("definitely-not-existing-repository")


def test_scanner_rejects_file_path(tmp_path):
    scanner = FileScanner()

    file_path = tmp_path / "repo.py"
    file_path.write_text("x = 1", encoding="utf-8")

    with pytest.raises(
        ValueError,
        match="not a directory",
    ):
        scanner.scan(str(file_path))


def test_scanner_skips_invalid_utf8(tmp_path):
    scanner = FileScanner()

    bad_file = tmp_path / "bad.py"
    bad_file.write_bytes(b"\xff\xfe\xfd")

    good_file = tmp_path / "good.py"
    good_file.write_text(
        "x = 1",
        encoding="utf-8",
    )

    files = scanner.scan(str(tmp_path))

    assert any(file.path == "good.py" for file in files)
    assert all(file.path != "bad.py" for file in files)


@pytest.mark.parametrize(
    "filename",
    [
        ".env",
        ".env.local",
        ".env.production",
        ".env.development",
        ".env.test",
        ".env.staging",
    ],
)
def test_scanner_skips_sensitive_environment_files(tmp_path, filename):
    scanner = FileScanner()

    sensitive_file = tmp_path / filename
    sensitive_file.write_text(
        'API_KEY = "super-secret-value"',
        encoding="utf-8",
    )

    files = scanner.scan(str(tmp_path))

    assert all(file.path != filename for file in files)


def test_scanner_allows_env_example(tmp_path):
    scanner = FileScanner()

    env_example = tmp_path / ".env.example"
    env_example.write_text(
        "API_KEY=your-api-key-here",
        encoding="utf-8",
    )

    files = scanner.scan(str(tmp_path))

    assert all(file.path != ".env.example" for file in files)


@pytest.mark.parametrize(
    "filename",
    [
        "server.pem",
        "private.key",
        "certificate.p12",
        "certificate.pfx",
        "certificate.crt",
        "certificate.cer",
    ],
)
def test_scanner_skips_sensitive_key_and_certificate_files(
    tmp_path,
    filename,
):
    scanner = FileScanner()

    sensitive_file = tmp_path / filename
    sensitive_file.write_text(
        "-----BEGIN PRIVATE KEY-----",
        encoding="utf-8",
    )

    files = scanner.scan(str(tmp_path))

    assert all(file.path != filename for file in files)


def test_scanner_keeps_normal_source_files(tmp_path):
    scanner = FileScanner()

    python_file = tmp_path / "main.py"
    javascript_file = tmp_path / "app.js"

    python_file.write_text("print('hello')", encoding="utf-8")
    javascript_file.write_text("console.log('hello');", encoding="utf-8")

    files = scanner.scan(str(tmp_path))

    paths = {file.path for file in files}

    assert "main.py" in paths
    assert "app.js" in paths


def test_scanner_path_containment():
    scanner = FileScanner()

    root = Path("C:/repository").resolve()
    inside = (root / "src" / "main.py").resolve()
    outside = (root.parent / "other" / "main.py").resolve()

    assert scanner._is_inside_root(inside, root)
    assert not scanner._is_inside_root(outside, root)
