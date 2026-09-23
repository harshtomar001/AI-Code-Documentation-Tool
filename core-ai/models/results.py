from pydantic import BaseModel, Field

from models.changes import BeforeAfterChange
from models.documentation import DocumentationResult


class AIResult(BaseModel):
    documentation: DocumentationResult
    changes: list[BeforeAfterChange] = Field(default_factory=list)