import re

from models.scanner import SourceFile
from models.security import SecurityMatch


class SecurityScanner:

    PATTERNS = [
        # API keys / secrets assigned to variables
        (
            "secret",
            "api_key",
            re.compile(
                r'(?i)\b(api[_-]?key)\b\s*[:=]\s*["\']([^"\']+)["\']'
            ),
            "[REDACTED_API_KEY]",
        ),

        # Passwords
        (
            "secret",
            "password",
            re.compile(
                r'(?i)\b(password|passwd|pwd)\b\s*[:=]\s*["\']([^"\']+)["\']'
            ),
            "[REDACTED_PASSWORD]",
        ),

        # Access tokens
        (
            "secret",
            "access_token",
            re.compile(
                r'(?i)\b(access[_-]?token)\b\s*[:=]\s*["\']([^"\']+)["\']'
            ),
            "[REDACTED_ACCESS_TOKEN]",
        ),

        # Generic secret/token assignments
        (
            "secret",
            "secret",
            re.compile(
                r'(?i)\b(secret|token)\b\s*[:=]\s*["\']([^"\']+)["\']'
            ),
            "[REDACTED_SECRET]",
        ),

        # Private keys
        (
            "secret",
            "private_key",
            re.compile(
                r"-----BEGIN [A-Z ]*PRIVATE KEY-----"
            ),
            "[REDACTED_PRIVATE_KEY]",
        ),

        # Email addresses
        (
            "pii",
            "email",
            re.compile(
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
            ),
            "[REDACTED_EMAIL]",
        ),

        # Indian / international-style phone numbers
        (
            "pii",
            "phone",
            re.compile(
                r'(?<!\d)(?:\+91[-\s]?)?[6-9]\d{9}(?!\d)'
            ),
            "[REDACTED_PHONE]",
        ),
    ]

    def scan(
        self,
        files: list[SourceFile],
    ) -> list[SecurityMatch]:

        matches = []

        for file in files:

            for (
                finding_type,
                category,
                pattern,
                replacement,
            ) in self.PATTERNS:

                for match in pattern.finditer(file.content):

                    # For key/value patterns, only redact the value,
                    # not the variable name.
                    if category in {
                        "api_key",
                        "password",
                        "access_token",
                        "secret",
                    }:
                        start = match.start(2)
                        end = match.end(2)

                    else:
                        start = match.start()
                        end = match.end()

                    line = file.content.count(
                        "\n",
                        0,
                        start,
                    ) + 1

                    matches.append(
                        SecurityMatch(
                            type=finding_type,
                            category=category,
                            file=file.path,
                            line=line,
                            start=start,
                            end=end,
                            replacement=replacement,
                        )
                    )

        return matches