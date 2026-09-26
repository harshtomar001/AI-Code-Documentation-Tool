"""Stale documentation detection utilities.

This module analyzes documented Python functions and methods to identify
documentation that does not mention parameters present in the source code.
"""

import ast

from .models.analysis import AnalysisResult
from .models.documentation_analysis import (
    StaleDocumentationIssue,
    StaleDocumentationResult,
)
from .models.scanner import SourceFile


class StaleDocumentationDetector:
    """Detect stale parameter documentation in Python source files."""

    def detect(
        self,
        analysis: AnalysisResult,
        files: list[SourceFile],
    ) -> StaleDocumentationResult:
        """Detect documentation that is missing source-code parameters.

        Args:
            analysis: Results produced by the AST analysis stage.
            files: Source files discovered by the repository scanner.

        Returns:
            A StaleDocumentationResult containing detected stale
            documentation issues.
        """
        issues: list[StaleDocumentationIssue] = []

        source_map: dict[str, str] = {
            file.path: file.content
            for file in files
        }

        for file_analysis in analysis.files:

            source = source_map.get(file_analysis.path)

            if source is None:
                continue

            try:
                tree = ast.parse(source)
            except SyntaxError:
                continue

            for node in ast.walk(tree):

                if not isinstance(
                    node,
                    (
                        ast.FunctionDef,
                        ast.AsyncFunctionDef,
                    ),
                ):
                    continue

                if ast.get_docstring(node) is None:
                    continue

                if node.name.startswith("_"):
                    continue

                parameters = self._get_parameters(node)

                docstring = ast.get_docstring(node)

                if docstring is None:
                    continue

                documented_parameters = (
                    self._extract_documented_parameters(
                        docstring
                    )
                )

                missing_parameters = [
                    parameter
                    for parameter in parameters
                    if parameter not in documented_parameters
                ]

                if missing_parameters:

                    issues.append(
                        StaleDocumentationIssue(
                            file=file_analysis.path,
                            target=node.name,
                            type=(
                                "method"
                                if self._is_method(node, tree)
                                else "function"
                            ),
                            line=node.lineno,
                            issue="stale",
                            details=(
                                "Documentation does not mention "
                                f"parameters: {missing_parameters}"
                            ),
                        )
                    )

        return StaleDocumentationResult(
            issues=issues
        )

    def _get_parameters(
        self,
        node: ast.FunctionDef | ast.AsyncFunctionDef,
    ) -> list[str]:
        """Extract documented-relevant parameters from a function node.

        ``self`` and ``cls`` are excluded to preserve the detector's
        existing behavior.

        Args:
            node: AST node representing a function or method.

        Returns:
            A list of parameter names excluding ``self`` and ``cls``.
        """
        parameters: list[str] = []

        for argument in node.args.args:

            if argument.arg in {"self", "cls"}:
                continue

            parameters.append(argument.arg)

        return parameters

    def _extract_documented_parameters(
        self,
        docstring: str,
    ) -> list[str]:
        """Extract parameter names mentioned in a docstring.

        Args:
            docstring: Function or method docstring to inspect.

        Returns:
            A list of parameter names detected from colon-separated
            documentation lines.
        """
        documented: list[str] = []

        try:
            tree = ast.parse(
                '"""' + docstring + '"""'
            )
        except SyntaxError:
            return documented

        text = docstring.splitlines()

        for line in text:

            stripped = line.strip()

            if ":" not in stripped:
                continue

            parameter = stripped.split(":", 1)[0].strip()

            if parameter.startswith("*"):
                parameter = parameter.lstrip("*")

            if parameter.isidentifier():
                documented.append(parameter)

        return documented

    def _is_method(
        self,
        node: ast.FunctionDef | ast.AsyncFunctionDef,
        tree: ast.AST,
    ) -> bool:
        """Determine whether a function node belongs to a class.

        Args:
            node: Function or async-function AST node.
            tree: Parsed module AST containing the node.

        Returns:
            ``True`` when the function is directly contained in a class;
            otherwise ``False``.
        """
        for parent in ast.walk(tree):

            if not isinstance(parent, ast.ClassDef):
                continue

            for child in parent.body:

                if child is node:
                    return True

        return False