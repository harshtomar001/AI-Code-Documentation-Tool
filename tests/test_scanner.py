from pathlib import Path

from core_ai.scanner import FileScanner


def test_scanner_finds_python_files():
    scanner = FileScanner()

    project_root = Path(__file__).resolve().parents[1]
    files = scanner.scan(str(project_root))

    assert files, "Scanner should find files in the project"

    python_files = [
        file
        for file in files
        if file.language == "python"
    ]

    assert python_files, "Scanner should find Python files"


def test_scanner_returns_source_file_paths():
    scanner = FileScanner()

    project_root = Path(__file__).resolve().parents[1]
    files = scanner.scan(str(project_root))

    assert all(file.path for file in files)
