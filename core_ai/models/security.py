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
        self.safe_for_ai = not self.findings
        return self


class SanitizedFile(BaseModel):
    path: str
    content: str

    # Physical source range represented by this chunk.
    start_line: int | None = None
    end_line: int | None = None

    # AST/documentation target range represented by this chunk.
    #
    # These are intentionally separate from start_line/end_line because
    # class chunks may include the class declaration as context while
    # targeting only a subset of its methods.
    target_start_line: int | None = None
    target_end_line: int | None = None


class SecurityMatch(BaseModel):
    type: Literal["secret", "pii"]
    category: str
    file: str
    line: int
    start: int
    end: int
    replacement: str
