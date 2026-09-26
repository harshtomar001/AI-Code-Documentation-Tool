from typing import Literal

from pydantic import BaseModel, Field, model_validator


class SecurityFinding(BaseModel):
    type: Literal["secret", "pii"]
    category: str
    file: str
    line: int
    redacted: bool


class SecurityResult(BaseModel):
    safe_for_ai: bool = True
    findings: list[SecurityFinding] = Field(default_factory=list)

    @model_validator(mode="after")
    def calculate_safety(self) -> "SecurityResult":
        """Derive AI safety from whether security findings exist."""
        self.safe_for_ai = not self.findings
        return self


class SanitizedFile(BaseModel):
    path: str
    content: str


class SecurityMatch(BaseModel):
    type: Literal["secret", "pii"]
    category: str
    file: str
    line: int
    start: int
    end: int
    replacement: str
