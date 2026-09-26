"""Security scanning utilities.

This module scans source files for configured secret and personally
identifiable information (PII) patterns and produces security matches
for downstream redaction.
"""

import math
import re
from collections import Counter
from re import Pattern
from typing import Literal

from .models.scanner import SourceFile
from .models.security import SecurityMatch

FindingType = Literal["secret", "pii"]

PatternDefinition = tuple[
    FindingType,
    str,
    Pattern[str],
    str,
]


class SecurityScanner:
    """Scan source files for configured secrets and PII patterns."""

    PATTERNS: list[PatternDefinition] = [
        # Google / Gemini API keys
        (
            "secret",
            "google_api_key",
            re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
            "[REDACTED_GOOGLE_API_KEY]",
        ),
        # OpenAI API keys
        (
            "secret",
            "openai_api_key",
            re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
            "[REDACTED_OPENAI_API_KEY]",
        ),
        # GitHub personal access tokens
        (
            "secret",
            "github_token",
            re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b"),
            "[REDACTED_GITHUB_TOKEN]",
        ),
        # AWS access key IDs
        (
            "secret",
            "aws_access_key",
            re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
            "[REDACTED_AWS_ACCESS_KEY]",
        ),
        # API keys / secrets assigned to variables
        (
            "secret",
            "api_key",
            re.compile(r'(?i)\b(api[_-]?key)\b\s*[:=]\s*["\']([^"\']+)["\']'),
            "[REDACTED_API_KEY]",
        ),
        # Passwords
        (
            "secret",
            "password",
            re.compile(r'(?i)\b(password|passwd|pwd)\b\s*[:=]\s*["\']([^"\']+)["\']'),
            "[REDACTED_PASSWORD]",
        ),
        # Access tokens
        (
            "secret",
            "access_token",
            re.compile(r'(?i)\b(access[_-]?token)\b\s*[:=]\s*["\']([^"\']+)["\']'),
            "[REDACTED_ACCESS_TOKEN]",
        ),
        # Generic secret/token assignments
        (
            "secret",
            "secret",
            re.compile(r'(?i)\b(secret|token)\b\s*[:=]\s*["\']([^"\']+)["\']'),
            "[REDACTED_SECRET]",
        ),
        # Private keys
        (
            "secret",
            "private_key",
            re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
            "[REDACTED_PRIVATE_KEY]",
        ),
        # Email addresses
        (
            "pii",
            "email",
            re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
            "[REDACTED_EMAIL]",
        ),
        # Indian / international-style phone numbers
        (
            "pii",
            "phone",
            re.compile(r"(?<!\d)(?:\+91[-\s]?)?[6-9]\d{9}(?!\d)"),
            "[REDACTED_PHONE]",
        ),
    ]

    def __init__(
        self,
        patterns: list[PatternDefinition] | None = None,
    ) -> None:
        """Initialize the scanner with optional custom patterns.

        Args:
            patterns: Custom pattern definitions. When omitted, the
                built-in security patterns are used.
        """
        self.patterns = patterns if patterns is not None else self.PATTERNS

    ENTROPY_MIN_LENGTH = 20
    ENTROPY_THRESHOLD = 4.0

    def scan(
        self,
        files: list[SourceFile],
    ) -> list[SecurityMatch]:
        """Scan source files for configured security-sensitive patterns.

        Args:
            files: Source files discovered by the repository scanner.

        Returns:
            A list of SecurityMatch objects describing detected secrets
            and PII, including their locations and redaction replacements.
        """
        matches: list[SecurityMatch] = []

        for file in files:
            matches.extend(self._scan_file(file))

        return matches

    def _scan_file(self, file: SourceFile) -> list[SecurityMatch]:
        """Scan one source file using configured patterns and entropy checks."""
        matches: list[SecurityMatch] = []
        for (
            finding_type,
            category,
            pattern,
            replacement,
        ) in self.patterns:
            for match in pattern.finditer(file.content):
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

                matches.append(
                    self._create_match(
                        file,
                        finding_type,
                        category,
                        start,
                        end,
                        replacement,
                    )
                )

        matches.extend(self._scan_high_entropy_strings(file))

        return matches

    def _scan_high_entropy_strings(
        self,
        file: SourceFile,
    ) -> list[SecurityMatch]:
        """Detect long quoted strings with unusually high entropy."""
        matches: list[SecurityMatch] = []

        string_pattern = re.compile(r"""["']([A-Za-z0-9+/=_-]{20,})["']""")

        for match in string_pattern.finditer(file.content):
            value = match.group(1)

            if len(value) < self.ENTROPY_MIN_LENGTH:
                continue

            if self._shannon_entropy(value) < self.ENTROPY_THRESHOLD:
                continue

            start = match.start(1)
            end = match.end(1)

            matches.append(
                self._create_match(
                    file,
                    "secret",
                    "high_entropy",
                    start,
                    end,
                    "[REDACTED_HIGH_ENTROPY]",
                )
            )

        return matches

    @staticmethod
    def _shannon_entropy(value: str) -> float:
        """Calculate Shannon entropy for a string."""
        if not value:
            return 0.0

        counts = Counter(value)
        length = len(value)

        return -sum(
            (count / length) * math.log2(count / length) for count in counts.values()
        )

    @staticmethod
    def _create_match(
        file: SourceFile,
        finding_type: FindingType,
        category: str,
        start: int,
        end: int,
        replacement: str,
    ) -> SecurityMatch:
        """Create a security match with its source line number."""
        line = file.content.count("\n", 0, start) + 1

        return SecurityMatch(
            type=finding_type,
            category=category,
            file=file.path,
            line=line,
            start=start,
            end=end,
            replacement=replacement,
        )
