from pydantic import BaseModel


class SourceFile(BaseModel):
    path: str
    language: str
    content: str