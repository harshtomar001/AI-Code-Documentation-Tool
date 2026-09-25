from pydantic import BaseModel, Field

from .changes import BeforeAfterChange
from .documentation import DocumentationResult


class AIResult(BaseModel):
    documentation: DocumentationResult
    changes: list[BeforeAfterChange] = Field(default_factory=list)