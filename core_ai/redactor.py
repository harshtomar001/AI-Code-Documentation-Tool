"""Sensitive-information redaction utilities.

This module replaces security-sensitive matches in source files with
their configured redaction values before the files are passed to
downstream AI processing.
"""

from .models.scanner import SourceFile
from .models.security import (
    SanitizedFile,
    SecurityMatch,
)


class Redactor:
    """Redact detected security-sensitive content from source files."""

    def redact(
        self,
        files: list[SourceFile],
        matches: list[SecurityMatch],
    ) -> list[SanitizedFile]:
        """Redact security matches from the supplied source files.

        Args:
            files: Source files that may contain sensitive information.
            matches: Security matches produced by the security scanner.

        Returns:
            A list of sanitized files with detected sensitive content
            replaced by the configured replacement values.
        """
        matches_by_file: dict[str, list[SecurityMatch]] = {}

        for match in matches:
            matches_by_file.setdefault(
                match.file,
                [],
            ).append(match)

        sanitized_files: list[SanitizedFile] = []

        for file in files:

            file_matches = matches_by_file.get(
                file.path,
                [],
            )

            if not file_matches:

                sanitized_files.append(
                    SanitizedFile(
                        path=file.path,
                        content=file.content,
                    )
                )

                continue

            # Process from right to left so that replacing
            # one match doesn't change the positions of
            # matches that come before it.
            file_matches = sorted(
                file_matches,
                key=lambda match: match.start,
                reverse=True,
            )

            content = file.content

            for match in file_matches:

                content = (
                    content[:match.start]
                    + match.replacement
                    + content[match.end:]
                )

            sanitized_files.append(
                SanitizedFile(
                    path=file.path,
                    content=content,
                )
            )

        return sanitized_files