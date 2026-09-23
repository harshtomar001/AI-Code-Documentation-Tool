from pathlib import Path

from models.scanner import SourceFile


class FileScanner:

    SUPPORTED_EXTENSIONS = {
        ".py": "python",
        ".js": "javascript",
    }

    IGNORED_DIRECTORIES = {
        ".git",
        "__pycache__",
        "node_modules",
        ".venv",
        "venv",
        ".idea",
    }

    def scan(self, repository_path: str) -> list[SourceFile]:

        root = Path(repository_path)

        if not root.exists():
            raise FileNotFoundError(
                f"Repository does not exist: {repository_path}"
            )

        if not root.is_dir():
            raise ValueError(
                f"Repository path is not a directory: {repository_path}"
            )

        files = []

        for path in root.rglob("*"):

            if not path.is_file():
                continue

            if any(
                ignored in path.parts
                for ignored in self.IGNORED_DIRECTORIES
            ):
                continue

            language = self.SUPPORTED_EXTENSIONS.get(path.suffix.lower())

            if language is None:
                continue

            try:
                content = path.read_text(
                    encoding="utf-8"
                )
            except UnicodeDecodeError:
                continue

            relative_path = path.relative_to(root)

            files.append(
                SourceFile(
                    path=str(relative_path),
                    language=language,
                    content=content
                )
            )

        return files