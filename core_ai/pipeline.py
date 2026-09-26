"""Core AI analysis pipeline.

This module orchestrates the complete code documentation analysis workflow:

1. Repository file scanning
2. AST-based source analysis
3. Documentation completeness checking
4. Stale documentation detection
5. Security scanning
6. Sensitive-data redaction
7. AI input construction
8. Optional AI documentation generation
"""

from .ai.service import AIService
from .ast_analyzer import ASTAnalyzer
from .documentation_checker import DocumentationChecker
from .models.input import AIInput, RepositoryInfo
from .models.pipelines import PipelineResult
from .models.results import AIResult
from .exceptions import PipelineError
from .models.security import SecurityFinding, SecurityResult
from .redactor import Redactor
from .scanner import FileScanner
from .security_scanner import SecurityScanner
from .stale_documentation import StaleDocumentationDetector


class CorePipeline:
    """Orchestrate the complete Core AI code-analysis pipeline.

    The pipeline coordinates repository scanning, source-code analysis,
    documentation checks, stale-documentation detection, security scanning,
    sensitive-data redaction, and optional AI documentation generation.
    """

    def __init__(self, ai_service: AIService | None = None) -> None:
        """Initialize the Core AI pipeline and its analysis components.

        Args:
            ai_service: Optional service responsible for generating
                documentation from the prepared AI input.
        """
        self.ai_service = ai_service

        self.file_scanner = FileScanner()
        self.ast_analyzer = ASTAnalyzer()
        self.documentation_checker = DocumentationChecker()
        self.stale_detector = StaleDocumentationDetector()
        self.security_scanner = SecurityScanner()
        self.redactor = Redactor()

    def run(
        self,
        repository_path: str,
        repository_name: str = "repository",
    ) -> PipelineResult:
        """Run the complete Core AI analysis pipeline.

        Args:
            repository_path: Path to the repository that should be analyzed.
            repository_name: Human-readable name used in the generated
                repository metadata.

        Returns:
            A PipelineResult containing the repository analysis,
            documentation findings, stale-documentation findings,
            security results, sanitized files, AI input, and optional
            AI-generated documentation.
        """

        try:


            # M1: Scan repository

            files = self.file_scanner.scan(repository_path)

            # M2: Analyze source code

            analysis = self.ast_analyzer.analyze(files)

            # M3: Find undocumented public APIs

            documentation_check = self.documentation_checker.check(
                analysis
            )

            # M4: Find stale documentation

            stale_documentation = self.stale_detector.detect(
                analysis,
                files,
            )

            # M5: Scan secrets / PII

            security_matches = self.security_scanner.scan(files)

            # M6: Redact sensitive information


            sanitized_files = self.redactor.redact(
                files,
                security_matches,
            )

            # Build security result

            security_findings = [
                SecurityFinding(
                    type=match.type,
                    category=match.category,
                    file=match.file,
                    line=match.line,
                    redacted=True,
                )
                for match in security_matches
            ]

            security_result = SecurityResult(
                safe_for_ai=not security_findings,
                findings=security_findings,
            )

            # Build AI input


            ai_input = AIInput(
                repository=RepositoryInfo(
                    name=repository_name,
                    files=[
                        file.path
                        for file in files
                    ],
                ),
                analysis=analysis,
                security=security_result,
                files=sanitized_files,
            )

            # AI generation


            ai_result: AIResult | None = None

            if self.ai_service is not None:
                ai_result = self.ai_service.generate_documentation(
                    ai_input
                )

            return PipelineResult(
                files=files,
                analysis=analysis,
                documentation_check=documentation_check,
                stale_documentation=stale_documentation,
                security=security_result,
                sanitized_files=sanitized_files,
                ai_input=ai_input,
                ai_result=ai_result,
            )


        except PipelineError:

            raise

        except Exception as exc:

            raise PipelineError(

                "Core AI pipeline failed"

            ) from exc