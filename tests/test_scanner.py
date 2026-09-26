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
