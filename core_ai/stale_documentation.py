import ast

from .models.analysis import AnalysisResult
from .models.scanner import SourceFile
from .models.documentation_analysis import (
    StaleDocumentationIssue,
    StaleDocumentationResult,
)


class StaleDocumentationDetector:

    def detect(
        self,
        analysis: AnalysisResult,
        files: list[SourceFile],
    ) -> StaleDocumentationResult:

        issues = []

        source_map = {
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

                documented_parameters = self._extract_documented_parameters(
                    docstring
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

    def _get_parameters(self, node):

        parameters = []

        for argument in node.args.args:

            if argument.arg in {"self", "cls"}:
                continue

            parameters.append(argument.arg)

        return parameters

    def _extract_documented_parameters(self, docstring):

        documented = []

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

    def _is_method(self, node, tree):

        for parent in ast.walk(tree):

            if not isinstance(parent, ast.ClassDef):
                continue

            for child in parent.body:

                if child is node:
                    return True

        return False