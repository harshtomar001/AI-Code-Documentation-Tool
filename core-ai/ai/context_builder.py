from models.input import AIInput


"""
## Repository
Name: test-project

Files:
- app.py
- user.py
- utils.py

## Code Analysis

File: app.py
Language: python

Functions:
- process_user(user) [lines 8-18] [public=True] [docstring=False]

File: user.py
Language: python

Classes:
- User [lines 1-15] [public=True] [docstring=False]
  - get_email() [lines 7-10] [public=True] [docstring=False]

File: utils.py
Language: python

Functions:
- format_name(name) [lines 3-6] [public=True] [docstring=True]

## Security
Safe for AI: True

Redacted findings:
- secret: api_key in app.py line 3
- pii: email in user.py line 12

## Sanitized Source Code

--- app.py ---
API_KEY = "[REDACTED_SECRET]"

def process_user(user):
    return format_user(user)

--- user.py ---
class User:
    def __init__(self, email):
        self.email = "[REDACTED_PII]"

    def get_email(self):
        return self.email

--- utils.py ---
def format_name(name):
    "Format a user's name."
   # return name.strip().title()
"""


class ContextBuilder:

    def build(self, data: AIInput) -> str:
        sections = []

        sections.append(self._build_repository_section(data))
        sections.append(self._build_analysis_section(data))
        sections.append(self._build_security_section(data))
        sections.append(self._build_source_section(data))

        return "\n\n".join(sections)

    def _build_repository_section(self, data: AIInput) -> str:
        lines = [
            "## Repository",
            f"Name: {data.repository.name}",
            "",
            "Files:"
        ]

        for file in data.repository.files:
            lines.append(f"- {file}")

        return "\n".join(lines)

    def _build_analysis_section(self, data: AIInput) -> str:
        lines = [
            "## Code Analysis"
        ]

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
        lines = [
            "## Security",
            f"Safe for AI: {data.security.safe_for_ai}"
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
        lines = [
            "## Sanitized Source Code"
        ]

        for file in data.files:
            lines.append("")
            lines.append(f"--- {file.path} ---")
            lines.append(file.content)

        return "\n".join(lines)



