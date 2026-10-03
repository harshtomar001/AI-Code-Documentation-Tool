"""Build structured context for AI documentation generation."""

from ..models.input import AIInput


class ContextBuilder:
    """Build structured repository context for the AI documentation pipeline."""

    def build(self, data: AIInput) -> str:
        """Build the complete context from repository analysis data."""
        sections: list[str] = []

        sections.append(self._build_repository_section(data))
        sections.append(self._build_analysis_section(data))
        sections.append(self._build_security_section(data))
        sections.append(self._build_source_section(data))

        return "\n\n".join(sections)

    def _build_repository_section(self, data: AIInput) -> str:
        """Build repository metadata."""
        lines: list[str] = [
            "## Repository",
            f"Name: {data.repository.name}",
            "",
            "Files:",
        ]

        for file in data.repository.files:
            lines.append(f"- {file}")

        return "\n".join(lines)

    def _build_analysis_section(self, data: AIInput) -> str:
        """Build code-analysis information."""
        lines: list[str] = ["## Code Analysis"]

        for file in data.analysis.files:
            lines.append("")
            lines.append(f"File: {file.path}")
            lines.append(f"Language: {file.language}")

            if file.functions:
                lines.append("")
                lines.append("Functions:")

                for function in file.functions:
                    parameters = ", ".join(function.parameters)

                    lines.append(
                        f"- {function.name}({parameters}) "
                        f"[lines {function.line_start}-{function.line_end}] "
                        f"[public={function.is_public}] "
                        f"[docstring={function.has_docstring}]"
                    )

            if file.classes:
                lines.append("")
                lines.append("Classes:")

                for cls in file.classes:
                    lines.append(
                        f"- {cls.name} "
                        f"[lines {cls.line_start}-{cls.line_end}] "
                        f"[public={cls.is_public}] "
                        f"[docstring={cls.has_docstring}]"
                    )

                    if cls.methods:
                        for method in cls.methods:
                            parameters = ", ".join(method.parameters)

                            lines.append(
                                f"  - {method.name}({parameters}) "
                                f"[lines {method.line_start}-{method.line_end}] "
                                f"[public={method.is_public}] "
                                f"[docstring={method.has_docstring}]"
                            )

        return "\n".join(lines)

    def _build_security_section(self, data: AIInput) -> str:
        """Build security information."""
        lines: list[str] = [
            "## Security",
            f"Safe for AI: {data.security.safe_for_ai}",
        ]

        if data.security.findings:
            lines.append("")
            lines.append("Redacted findings:")

            for finding in data.security.findings:
                lines.append(
                    f"- {finding.type}: "
                    f"{finding.category} "
                    f"in {finding.file} "
                    f"line {finding.line}"
                )

        return "\n".join(lines)

    def _build_source_section(self, data: AIInput) -> str:
        """Build the sanitized source-code section."""
        lines: list[str] = ["## Sanitized Source Code"]

        for file in data.files:
            lines.append("")

            if file.start_line is not None and file.end_line is not None:
                if (
                    file.target_start_line is not None
                    and file.target_end_line is not None
                ):
                    lines.append(
                        f"--- {file.path} "
                        f"[source lines {file.start_line}-{file.end_line}; "
                        f"target lines "
                        f"{file.target_start_line}-{file.target_end_line}] ---"
                    )
                else:
                    lines.append(
                        f"--- {file.path} "
                        f"[lines {file.start_line}-{file.end_line}] ---"
                    )
            else:
                lines.append(f"--- {file.path} ---")

            lines.append(file.content)

        return "\n".join(lines)
