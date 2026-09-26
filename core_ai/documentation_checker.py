"""Documentation completeness checking utilities.

This module identifies undocumented public functions, classes, and methods
from the results produced by the AST analysis stage.
"""

from .models.analysis import AnalysisResult
from .models.documentation_analysis import (
    DocumentationCheckResult,
    DocumentationIssue,
)


class DocumentationChecker:
    """Check analyzed source code for missing public documentation."""

    def check(
        self,
        analysis: AnalysisResult,
    ) -> DocumentationCheckResult:
        """Find undocumented public functions, classes, and methods.

        Args:
            analysis: Results produced by the AST analysis stage.

        Returns:
            A DocumentationCheckResult containing all detected
            documentation issues.
        """
        issues: list[DocumentationIssue] = []

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