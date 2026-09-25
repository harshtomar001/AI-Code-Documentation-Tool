import ast

from .models.analysis import (
    AnalysisResult,
    FileAnalysis,
    FunctionAnalysis,
    ClassAnalysis,
    MethodAnalysis,
)
from .models.scanner import SourceFile


class ASTAnalyzer:

    def analyze(
        self,
        files: list[SourceFile]
    ) -> AnalysisResult:

        analyzed_files = []

        for file in files:

            if file.language != "python":
                continue

            try:
                tree = ast.parse(file.content)
            except SyntaxError:
                continue

            functions = []
            classes = []

            for node in tree.body:

                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    functions.append(
                        self._analyze_function(node)
                    )

                elif isinstance(node, ast.ClassDef):
                    classes.append(
                        self._analyze_class(node)
                    )

            analyzed_files.append(
                FileAnalysis(
                    path=file.path,
                    language=file.language,
                    functions=functions,
                    classes=classes,
                )
            )

        return AnalysisResult(
            files=analyzed_files
        )

    def _analyze_function(self, node):

        return FunctionAnalysis(
            name=node.name,
            line_start=node.lineno,
            line_end=node.end_lineno,
            parameters=self._get_parameters(node),
            has_docstring=ast.get_docstring(node) is not None,
            is_public=not node.name.startswith("_"),
        )

    def _analyze_class(self, node):

        methods = []

        for child in node.body:

            if isinstance(
                child,
                (ast.FunctionDef, ast.AsyncFunctionDef)
            ):
                methods.append(
                    self._analyze_method(child)
                )

        return ClassAnalysis(
            name=node.name,
            line_start=node.lineno,
            line_end=node.end_lineno,
            has_docstring=ast.get_docstring(node) is not None,
            is_public=not node.name.startswith("_"),
            methods=methods,
        )

    def _analyze_method(self, node):

        return MethodAnalysis(
            name=node.name,
            line_start=node.lineno,
            line_end=node.end_lineno,
            parameters=self._get_parameters(node),
            has_docstring=ast.get_docstring(node) is not None,
            is_public=not node.name.startswith("_"),
        )

    def _get_parameters(self, node):

        parameters = []

        for argument in node.args.args:
            parameters.append(argument.arg)

        return parameters