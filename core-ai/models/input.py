from pydantic import BaseModel, Field

from models.analysis import AnalysisResult
from models.security import SecurityResult, SanitizedFile


class RepositoryInfo(BaseModel):
    name: str
    files: list[str] = Field(default_factory=list)


class AIInput(BaseModel):
    repository: RepositoryInfo
    analysis: AnalysisResult
    security: SecurityResult
    files: list[SanitizedFile] = Field(default_factory=list)