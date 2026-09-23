from pydantic import BaseModel, Field

from models.analysis import AnalysisResult
from models.documentation_analysis import (
    DocumentationCheckResult,
    StaleDocumentationResult,
)
from models.input import AIInput
from models.results import AIResult
from models.scanner import SourceFile
from models.security import SecurityResult, SanitizedFile


class PipelineResult(BaseModel):
    files: list[SourceFile] = Field(default_factory=list)

    analysis: AnalysisResult

    documentation_check: DocumentationCheckResult

    stale_documentation: StaleDocumentationResult

    security: SecurityResult

    sanitized_files: list[SanitizedFile] = Field(
        default_factory=list
    )

    ai_input: AIInput | None = None

    ai_result: AIResult | None = None