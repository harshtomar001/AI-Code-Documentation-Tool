from pydantic import BaseModel, Field

from .analysis import AnalysisResult
from .documentation_analysis import (
    DocumentationCheckResult,
    StaleDocumentationResult,
)
from .input import AIInput
from .results import AIResult
from .scanner import SourceFile
from .security import SecurityResult, SanitizedFile


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