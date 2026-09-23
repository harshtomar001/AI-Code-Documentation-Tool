from models.input import AIInput, RepositoryInfo
from models.results import AIResult
from models.security import SecurityResult, SecurityFinding
from models.pipelines import PipelineResult
from scanner import FileScanner
from ast_analyzer import ASTAnalyzer
from documentation_checker import DocumentationChecker
from stale_documentation import StaleDocumentationDetector
from security_scanner import SecurityScanner
from redactor import Redactor


class CorePipeline:

    def __init__(
        self,
        ai_service=None,
    ):
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
    ):

        # --------------------------------------------------
        # M1: Scan repository
        # --------------------------------------------------

        files = self.file_scanner.scan(
            repository_path
        )

        # --------------------------------------------------
        # M2: Analyze source code
        # --------------------------------------------------

        analysis = self.ast_analyzer.analyze(
            files
        )

        # --------------------------------------------------
        # M3: Find undocumented public APIs
        # --------------------------------------------------

        documentation_check = (
            self.documentation_checker.check(
                analysis
            )
        )

        # --------------------------------------------------
        # M4: Find stale documentation
        # --------------------------------------------------

        stale_documentation = (
            self.stale_detector.detect(
                analysis,
                files,
            )
        )

        # --------------------------------------------------
        # M5: Scan secrets / PII
        # --------------------------------------------------

        security_matches = (
            self.security_scanner.scan(
                files
            )
        )

        # --------------------------------------------------
        # M6: Redact sensitive information
        # --------------------------------------------------

        sanitized_files = self.redactor.redact(
            files,
            security_matches,
        )

        # --------------------------------------------------
        # Build security result
        # --------------------------------------------------

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
            safe_for_ai=True,
            findings=security_findings,
        )

        # --------------------------------------------------
        # Build AI input
        # --------------------------------------------------

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

        # --------------------------------------------------
        # AI generation
        # --------------------------------------------------

        ai_result = None

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