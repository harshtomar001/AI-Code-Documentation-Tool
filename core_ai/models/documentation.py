from typing import Literal

from pydantic import BaseModel, Field


class DocumentationChange(BaseModel):
    type: Literal["docstring", "comment"]
    target: str
    content: str


class DocumentationFile(BaseModel):
    path: str
    changes: list[DocumentationChange] = Field(default_factory=list)


class DocumentationResult(BaseModel):
    files: list[DocumentationFile] = Field(default_factory=list)
    readme: str | None = None
