from models.analysis import AnalysisResult
from models.documentation import DocumentationResult
from models.changes import BeforeAfterChange
from models.security import SanitizedFile


class ChangeGenerator:

    def generate(
        self,
        documentation: DocumentationResult,
        analysis: AnalysisResult,
        files: list[SanitizedFile]
    ) -> list[BeforeAfterChange]:

        changes = []

        for documentation_file in documentation.files:

            source_file = self._find_file(
                files,
                documentation_file.path
            )

            analysis_file = self._find_analysis_file(
                analysis,
                documentation_file.path
            )

            if source_file is None or analysis_file is None:
                continue

            source_lines = source_file.content.splitlines()

            for change in documentation_file.changes:

                if change.type != "docstring":
                    continue

                target = self._find_target(
                    analysis_file,
                    change.target
                )

                if target is None:
                    continue

                before_lines = source_lines[
                    target.line_start - 1:
                    target.line_end
                ]

                before = "\n".join(before_lines)

                after = self._insert_docstring(
                    before,
                    target.line_start,
                    change.content
                )

                changes.append(
                    BeforeAfterChange(
                        file=documentation_file.path,
                        target=change.target,
                        type=change.type,
                        before=before,
                        after=after
                    )
                )

        return changes

    def _find_file(
        self,
        files: list[SanitizedFile],
        path: str
    ) -> SanitizedFile | None:

        for file in files:
            if file.path == path:
                return file

        return None

    def _find_analysis_file(
        self,
        analysis: AnalysisResult,
        path: str
    ):
        for file in analysis.files:
            if file.path == path:
                return file

        return None

    def _find_target(
        self,
        analysis_file,
        target_name: str
    ):
        for function in analysis_file.functions:
            if function.name == target_name:
                return function

        for cls in analysis_file.classes:

            if cls.name == target_name:
                return cls

            for method in cls.methods:
                if method.name == target_name:
                    return method

        return None

    def _insert_docstring(
            self,
            source: str,
            line_start: int,
            content: str
    ) -> str:

        lines = source.splitlines()

        if not lines:
            return source

        # Indentation of the function/class definition.
        definition_indent = len(lines[0]) - len(lines[0].lstrip())

        indentation = " " * (definition_indent + 4)

        # Build the new docstring.
        docstring_lines = content.splitlines()

        docstring = [
            f'{indentation}"""{docstring_lines[0]}'
        ]

        for line in docstring_lines[1:]:
            docstring.append(
                f"{indentation}{line}"
            )

        docstring.append(
            f'{indentation}"""'
        )

        # Check whether the function/class already has a docstring.
        body_start = 1

        while body_start < len(lines) and not lines[body_start].strip():
            body_start += 1

        if (
                body_start < len(lines)
                and (
                lines[body_start].strip().startswith('"""')
                or lines[body_start].strip().startswith("'''")
        )
        ):
            quote = lines[body_start].strip()[:3]

            # Find the end of the existing docstring.
            docstring_end = body_start

            while docstring_end < len(lines):
                if (
                        docstring_end > body_start
                        and lines[docstring_end].strip().endswith(quote)
                ):
                    break

                docstring_end += 1

            # Replace existing docstring.
            return "\n".join(
                lines[:body_start]
                + docstring
                + lines[docstring_end + 1:]
            )

        # No existing docstring → insert one.
        return "\n".join(
            [lines[0]]
            + docstring
            + lines[1:]
        )