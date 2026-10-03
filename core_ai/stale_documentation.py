"""Stale documentation detection utilities.

This module detects documentation that refers to parameters which no longer
exist in the corresponding Python function or method signature.
"""

import ast
import re

from .models.analysis import AnalysisResult
from .models.documentation_analysis import (
    StaleDocumentationIssue,
    StaleDocumentationResult,
)
from .models.scanner import SourceFile


class StaleDocumentationDetector:
    """Detect documentation references to obsolete function parameters."""

    _SPHINX_PARAM_PATTERN = re.compile(
        r"^\s*:param(?:\s+\w+)?\s+([A-Za-z_]\w*)\s*:"
    )

    _GOOGLE_PARAM_PATTERN = re.compile(
        r"^\s*([*]{0,2}[A-Za-z_]\w*)\s*(?:\([^)]*\))?\s*:"
    )

    _NUMPY_PARAM_PATTERN = re.compile(
        r"^\s*([*]{0,2}[A-Za-z_]\w*)\s*(?:\([^)]*\))?\s*$"
    )

    _PARAMETER_SECTION_NAMES = {
        "args",
        "arguments",
        "parameters",
        "keyword arguments",
        "keyword args",
    }

    def detect(
        self,
        analysis: AnalysisResult,
        files: list[SourceFile],
    ) -> StaleDocumentationResult:
        """Detect documentation that refers to obsolete parameters.

        A documentation issue is reported only when a documented parameter
        does not exist in the current source-code signature.

        Missing documentation is intentionally handled by
        DocumentationChecker, not this detector.
        """
        issues: list[StaleDocumentationIssue] = []

        source_map = {
            file.path: file.content
            for file in files
        }

        for file_analysis in analysis.files:
            if file_analysis.language != "python":
                continue

            source = source_map.get(file_analysis.path)

            if source is None:
                continue

            try:
                tree = ast.parse(source)
            except SyntaxError:
                continue

            function_nodes: dict[
                tuple[str, int],
                ast.FunctionDef | ast.AsyncFunctionDef,
            ] = {}

            for node in tree.body:
                if isinstance(
                    node,
                    (ast.FunctionDef, ast.AsyncFunctionDef),
                ):
                    function_nodes[(node.name, node.lineno)] = node

                elif isinstance(node, ast.ClassDef):
                    for child in node.body:
                        if isinstance(
                            child,
                            (
                                ast.FunctionDef,
                                ast.AsyncFunctionDef,
                            ),
                        ):
                            function_nodes[
                                (child.name, child.lineno)
                            ] = child

            # Top-level functions.
            for function in file_analysis.functions:
                if not function.has_docstring or not function.is_public:
                    continue

                node = function_nodes.get(
                    (function.name, function.line_start)
                )

                if node is None:
                    continue

                self._check_function(
                    node=node,
                    file_path=file_analysis.path,
                    target_type="function",
                    issues=issues,
                )

            # Class methods.
            for class_analysis in file_analysis.classes:
                for method in class_analysis.methods:
                    if not method.has_docstring or not method.is_public:
                        continue

                    node = function_nodes.get(
                        (method.name, method.line_start)
                    )

                    if node is None:
                        continue

                    self._check_function(
                        node=node,
                        file_path=file_analysis.path,
                        target_type="method",
                        issues=issues,
                    )

        return StaleDocumentationResult(issues=issues)

    def _check_function(
        self,
        *,
        node: ast.FunctionDef | ast.AsyncFunctionDef,
        file_path: str,
        target_type: str,
        issues: list[StaleDocumentationIssue],
    ) -> None:
        """Check one documented function or method."""

        docstring = ast.get_docstring(node)

        if docstring is None:
            return

        source_parameters = self._get_source_parameters(node)

        if not source_parameters:
            return

        documented_parameters = self._extract_documented_parameters(
            docstring
        )

        if not documented_parameters:
            return

        stale_parameters = sorted(
            parameter
            for parameter in documented_parameters
            if parameter not in source_parameters
        )

        if not stale_parameters:
            return

        issues.append(
            StaleDocumentationIssue(
                file=file_path,
                target=node.name,
                type=target_type,
                line=node.lineno,
                issue="stale",
                details=(
                    "Documentation refers to parameters that no longer "
                    f"exist in the source signature: {stale_parameters}"
                ),
            )
        )

    def _get_source_parameters(
        self,
        node: ast.FunctionDef | ast.AsyncFunctionDef,
    ) -> set[str]:
        """Return all parameter names from the current source signature."""

        parameters: set[str] = set()

        arguments = node.args

        for argument in arguments.posonlyargs:
            parameters.add(argument.arg)

        for argument in arguments.args:
            parameters.add(argument.arg)

        for argument in arguments.kwonlyargs:
            parameters.add(argument.arg)

        if arguments.vararg is not None:
            parameters.add(arguments.vararg.arg)

        if arguments.kwarg is not None:
            parameters.add(arguments.kwarg.arg)

        parameters.discard("self")
        parameters.discard("cls")

        return parameters

    def _extract_documented_parameters(
        self,
        docstring: str,
    ) -> set[str]:
        """Extract explicitly documented parameter names.

        Supports common Sphinx, Google-style, and NumPy-style parameter
        documentation without treating arbitrary colon-separated sentences
        such as ``Returns:`` as parameters.
        """

        documented: set[str] = set()

        lines = docstring.splitlines()
        in_parameter_section = False

        for index, line in enumerate(lines):
            stripped = line.strip()

            if not stripped:
                continue

            # Sphinx-style:
            # :param value: Description
            sphinx_match = self._SPHINX_PARAM_PATTERN.match(line)

            if sphinx_match:
                documented.add(sphinx_match.group(1).lstrip("*"))
                continue

            normalized = stripped.rstrip(":").lower()

            # Google-style section:
            # Args:
            #     value: Description
            if normalized in self._PARAMETER_SECTION_NAMES:
                in_parameter_section = True
                continue

            # Leave the parameter section when another documented section
            # starts.
            if stripped.endswith(":"):
                possible_section = stripped[:-1].strip().lower()

                if (
                    possible_section
                    and possible_section
                    not in self._PARAMETER_SECTION_NAMES
                ):
                    in_parameter_section = False

            if in_parameter_section:
                google_match = self._GOOGLE_PARAM_PATTERN.match(line)

                if google_match:
                    documented.add(
                        google_match.group(1).lstrip("*")
                    )
                    continue

            # NumPy-style sections:
            #
            # Parameters
            # ----------
            # value : int
            #
            # The parameter line itself can be identified by looking for a
            # following type separator.
            if index + 1 < len(lines):
                next_line = lines[index + 1].strip()

                if (
                    re.fullmatch(r"-{3,}", next_line)
                    and stripped.lower()
                    in self._PARAMETER_SECTION_NAMES
                ):
                    in_parameter_section = True
                    continue

            if in_parameter_section:
                numpy_match = self._NUMPY_PARAM_PATTERN.match(stripped)

                if numpy_match:
                    next_line = (
                        lines[index + 1].strip()
                        if index + 1 < len(lines)
                        else ""
                    )

                    if next_line.startswith(":"):
                        documented.add(
                            numpy_match.group(1).lstrip("*")
                        )

        return documented
