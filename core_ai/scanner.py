"""Repository source-file scanning utilities.

This module provides the file scanner used by the Core AI pipeline to
discover supported source files while excluding common generated,
dependency, IDE, and sensitive files.
"""

from pathlib import Path

from .models.scanner import SourceFile


class FileScanner:
    """Scan a repository and collect supported source files."""

    SUPPORTED_EXTENSIONS: dict[str, str] = {
        ".py": "python",
        ".js": "javascript",
    }

    IGNORED_DIRECTORIES: set[str] = {
        ".git",
        "__pycache__",
        "node_modules",
        ".venv",
        "venv",
        ".idea",
    }

    SENSITIVE_FILENAMES: set[str] = {
        ".env",
        ".env.local",
        ".env.production",
        ".env.development",
        ".env.test",
        ".env.staging",
    }

    SENSITIVE_EXTENSIONS: set[str] = {
        ".pem",
        ".key",
        ".p12",
        ".pfx",
        ".crt",
        ".cer",
    }

    def scan(self, repository_path: str) -> list[SourceFile]:
        """Scan a repository for supported source files.

        Args:
            repository_path: Path to the repository directory.

        Returns:
            A list of SourceFile objects containing the relative path,
            detected language, and source content.

        Raises:
            FileNotFoundError: If the repository path does not exist.
            ValueError: If the repository path is not a directory.
        """
        root = Path(repository_path)

        if not root.exists():
            raise FileNotFoundError(f"Repository does not exist: {repository_path}")

        if not root.is_dir():
            raise ValueError(f"Repository path is not a directory: {repository_path}")

        root = root.resolve()
        files: list[SourceFile] = []

        for path in root.rglob("*"):
            if not path.is_file():
                continue

            if any(ignored in path.parts for ignored in self.IGNORED_DIRECTORIES):
                continue

            resolved_path = path.resolve()

            if not self._is_inside_root(resolved_path, root):
                continue

            if self._is_sensitive_file(path):
                continue

            language = self.SUPPORTED_EXTENSIONS.get(path.suffix.lower())

            if language is None:
                continue

            try:
                content = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue

            relative_path = resolved_path.relative_to(root)

            files.append(
                SourceFile(
                    path=str(relative_path),
                    language=language,
                    content=content,
                )
            )

        return files

    @staticmethod
    def _is_inside_root(path: Path, root: Path) -> bool:
        """Return whether a resolved path is contained by the repository root."""
        try:
            path.relative_to(root)
        except ValueError:
            return False

        return True

    def _is_sensitive_file(self, path: Path) -> bool:
        """Return whether a file should never enter the AI pipeline."""
        name = path.name.lower()
        suffix = path.suffix.lower()

        if name in self.SENSITIVE_FILENAMES:
            return True

        if name.startswith(".env.") and name != ".env.example":
            return True

        return suffix in self.SENSITIVE_EXTENSIONS
