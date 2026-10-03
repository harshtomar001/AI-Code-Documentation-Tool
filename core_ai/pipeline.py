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

from collections.abc import Callable

from .ai.service import AIService
from .ast_analyzer import ASTAnalyzer
from .batching import Batcher
from .documentation_checker import DocumentationChecker
from .events import EventProgress, EventPublisher
from .exceptions import PipelineError
from .models.input import AIInput, RepositoryInfo
from .models.pipelines import PipelineResult
from .models.results import AIResult
from .models.security import SecurityFinding, SecurityResult
from .redactor import Redactor
from .scanner import FileScanner
from .security_scanner import SecurityScanner
from .stale_documentation import StaleDocumentationDetector


class CorePipeline:
    """Orchestrate the complete Core AI code-analysis pipeline."""

    def __init__(
        self,
        ai_service: AIService | None = None,
        event_publisher: EventPublisher | None = None,
        job_id: str | None = None,
        max_batch_bytes: int = 100 * 1024,
        batch_result_handler: Callable[[int, int, AIResult], None] | None = None,
    ) -> None:
        """Initialize the Core AI pipeline.

        Args:
            ai_service: Optional service responsible for AI generation.
            event_publisher: Optional publisher for live pipeline events.
            job_id: Job identifier attached to emitted events.
        """
        self.ai_service = ai_service
        self.event_publisher = event_publisher
        self.job_id = job_id

        self.file_scanner = FileScanner()
        self.ast_analyzer = ASTAnalyzer()
        self.documentation_checker = DocumentationChecker()
        self.stale_detector = StaleDocumentationDetector()
        self.security_scanner = SecurityScanner()
        self.redactor = Redactor()
        self.batcher = Batcher(max_batch_bytes=max_batch_bytes)

        self.batch_result_handler = batch_result_handler

    def _emit(
        self,
        *,
        stage: str,
        event_type: str,
        message: str,
        current: int | None = None,
        total: int | None = None,
    ) -> None:
        """Emit a live pipeline event when event publishing is enabled."""
        if self.event_publisher is None or self.job_id is None:
            return

        progress = None

        if current is not None and total is not None:
            progress = EventProgress(
                current=current,
                total=total,
            )

        self.event_publisher.emit(
            job_id=self.job_id,
            stage=stage,  # type: ignore[arg-type]
            type=event_type,  # type: ignore[arg-type]
            message=message,
            progress=progress,
        )

    def run(
        self,
        repository_path: str,
        repository_name: str = "repository",
    ) -> PipelineResult:
        """Run the complete Core AI analysis pipeline."""
        try:
            # M1: Scan repository

            self._emit(
                stage="scan",
                event_type="started",
                message="Scanning repository files",
            )

            files = self.file_scanner.scan(repository_path)

            self._emit(
                stage="scan",
                event_type="completed",
                message=f"Scanned {len(files)} source files",
                current=len(files),
                total=len(files),
            )

            # M2: Analyze source code

            self._emit(
                stage="ast",
                event_type="started",
                message="AST analysis started",
            )

            analysis = self.ast_analyzer.analyze(files)

            self._emit(
                stage="ast",
                event_type="completed",
                message="AST analysis completed",
            )

            # M3: Documentation check

            self._emit(
                stage="generation",
                event_type="started",
                message="Checking documentation completeness",
            )

            documentation_check = self.documentation_checker.check(analysis)

            self._emit(
                stage="generation",
                event_type="completed",
                message="Documentation completeness check completed",
            )

            # M4: Stale documentation

            self._emit(
                stage="generation",
                event_type="started",
                message="Checking for stale documentation",
            )

            stale_documentation = self.stale_detector.detect(
                analysis,
                files,
            )

            self._emit(
                stage="generation",
                event_type="completed",
                message="Stale documentation check completed",
            )

            # M5: Security

            self._emit(
                stage="security",
                event_type="started",
                message="Scanning for secrets and PII",
            )

            security_matches = self.security_scanner.scan(files)

            self._emit(
                stage="security",
                event_type="completed",
                message=(
                    f"Security scan completed with {len(security_matches)} finding(s)"
                ),
            )

            # M6: Redaction

            self._emit(
                stage="redaction",
                event_type="started",
                message="Applying security redaction",
            )

            sanitized_files = self.redactor.redact(
                files,
                security_matches,
            )

            self._emit(
                stage="redaction",
                event_type="completed",
                message=(f"Redaction completed for {len(sanitized_files)} file(s)"),
            )

            self._emit(
                stage="batching",
                event_type="started",
                message="Creating documentation batches",
            )

            batches = self.batcher.create_batches(
                sanitized_files,
                analysis=analysis,
            )

            self._emit(
                stage="batching",
                event_type="completed",
                message=f"Created {len(batches)} documentation batches",
                current=len(batches),
                total=len(batches),
            )

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
                findings=security_findings,
            )

            ai_input = AIInput(
                repository=RepositoryInfo(
                    name=repository_name,
                    files=[file.path for file in files],
                ),
                analysis=analysis,
                security=security_result,
                files=sanitized_files,
            )

            # AI generation

            ai_result: AIResult | None = None

            if self.ai_service is not None and batches:
                self._emit(
                    stage="generation",
                    event_type="started",
                    message="Generating documentation with AI",
                )

                batch_results: list[AIResult] = []

                for batch in batches:
                    self._emit(
                        stage="batch",
                        event_type="started",
                        message=f"Batch {batch.batch_id} started",
                        current=batch.batch_id,
                        total=len(batches),
                    )

                    batch_result = self.ai_service.generate_batch_result(
                        ai_input,
                        batch.files,
                    )

                    batch_results.append(batch_result)

                    if self.batch_result_handler is not None:
                        self.batch_result_handler(
                            batch.batch_id,
                            len(batches),
                            batch_result,
                        )

                    self._emit(
                        stage="generation",
                        event_type="progress",
                        message=(
                            f"Generated documentation for "
                            f"batch {batch.batch_id}/{len(batches)}"
                        ),
                        current=batch.batch_id,
                        total=len(batches),
                    )

                # Merge individual batch results into the existing
                # PipelineResult-compatible AIResult.
                documentation_files = []
                changes = []
                readme = None

                for batch_result in batch_results:
                    documentation_files.extend(batch_result.documentation.files)
                    changes.extend(batch_result.changes)

                    if batch_result.documentation.readme:
                        readme = batch_result.documentation.readme

                ai_result = AIResult(
                    documentation=type(batch_results[0].documentation)(
                        files=documentation_files,
                        readme=readme,
                    ),
                    changes=changes,
                )

                self._emit(
                    stage="generation",
                    event_type="completed",
                    message="Documentation completed",
                    current=len(batches),
                    total=len(batches),
                )

            return PipelineResult(
                files=files,
                analysis=analysis,
                documentation_check=documentation_check,
                stale_documentation=stale_documentation,
                security=security_result,
                sanitized_files=sanitized_files,
                batches=batches,
                ai_input=ai_input,
                ai_result=ai_result,
            )

        except PipelineError:
            raise

        except Exception as exc:
            raise PipelineError("Core AI pipeline failed") from exc

