from pydantic import BaseModel, Field
from typing import Literal



class DocumentationIssue(BaseModel):
    file: str
    target: str
    type: Literal["function", "class", "method"]
    line: int
    issue: Literal["undocumented"]


class DocumentationCheckResult(BaseModel):
    issues: list[DocumentationIssue] = Field(default_factory=list)




class StaleDocumentationIssue(BaseModel):
    file: str
    target: str
    type: Literal["function", "method"]
    line: int
    issue: Literal["stale"]
    details: str


class StaleDocumentationResult(BaseModel):
    issues: list[StaleDocumentationIssue] = Field(default_factory=list)