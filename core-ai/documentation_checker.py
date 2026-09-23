from models.analysis import AnalysisResult
from models.documentation_analysis import (
    DocumentationCheckResult,
    DocumentationIssue,
)


class DocumentationChecker:

    def check(
        self,
        analysis: AnalysisResult
    ) -> DocumentationCheckResult:

        issues = []

        for file in analysis.files:

            # Check functions
            for function in file.functions:

                if function.is_public and not function.has_docstring:
                    issues.append(
                        DocumentationIssue(
                            file=file.path,
                            target=function.name,
                            type="function",
                            line=function.line_start,
                            issue="undocumented",
                        )
                    )

            # Check classes
            for cls in file.classes:

                if cls.is_public and not cls.has_docstring:
                    issues.append(
                        DocumentationIssue(
                            file=file.path,
                            target=cls.name,
                            type="class",
                            line=cls.line_start,
                            issue="undocumented",
                        )
                    )

                # Check methods
                for method in cls.methods:

                    if method.is_public and not method.has_docstring:
                        issues.append(
                            DocumentationIssue(
                                file=file.path,
                                target=f"{cls.name}.{method.name}",
                                type="method",
                                line=method.line_start,
                                issue="undocumented",
                            )
                        )

        return DocumentationCheckResult(
            issues=issues
        )