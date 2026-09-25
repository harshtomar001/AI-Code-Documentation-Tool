from .models.scanner import SourceFile
from .models.security import (
    SanitizedFile,
    SecurityMatch,
)


class Redactor:

    def redact(
        self,
        files: list[SourceFile],
        matches: list[SecurityMatch],
    ) -> list[SanitizedFile]:

        matches_by_file = {}

        for match in matches:
            matches_by_file.setdefault(
                match.file,
                []
            ).append(match)

        sanitized_files = []

        for file in files:

            file_matches = matches_by_file.get(
                file.path,
                []
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