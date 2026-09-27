from pathlib import Path

from core_ai.models.scanner import SourceFile
from core_ai.ast_analyzer import ASTAnalyzer


def test_ast_analyzer_analyzes_python_file():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="""
def hello(name):
    return f"Hello {name}"
"""
    )

    analyzer = ASTAnalyzer()
    result = analyzer.analyze([source])

    assert result is not None
    assert len(result.files) == 1


def test_ast_analyzer_detects_function():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="""
def hello(name):
    return f"Hello {name}"
"""
    )

    analyzer = ASTAnalyzer()
    result = analyzer.analyze([source])

    file_analysis = result.files[0]

    assert len(file_analysis.functions) == 1
    assert file_analysis.functions[0].name == "hello"
