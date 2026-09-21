from pydantic import BaseModel, Field
from typing import Literal


class SecurityFinding(BaseModel):
    type: Literal["secret", "pii"]
    category: str
    file: str
    line: int
    redacted: bool


class SecurityResult(BaseModel):
    safe_for_ai: bool
    findings: list[SecurityFinding] = Field(default_factory=list)


class SanitizedFile(BaseModel):
    path: str
    content: str