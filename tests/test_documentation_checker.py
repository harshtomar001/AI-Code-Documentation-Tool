from core_ai.models.scanner import SourceFile
from core_ai.ast_analyzer import ASTAnalyzer
from core_ai.documentation_checker import DocumentationChecker


def test_documentation_checker_detects_missing_docstring():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="""
def calculate(a, b):
    return a + b
"""
    )

    analyzer = ASTAnalyzer()
    analysis = analyzer.analyze([source])

    checker = DocumentationChecker()
    result = checker.check(analysis)

    assert result is not None
    assert len(result.issues) >= 1


def test_documentation_checker_does_not_flag_documented_function():
    source = SourceFile(
        path="sample.py",
        language="python",
        content='''
def calculate(a, b):
    """Calculate the sum of two numbers."""
    return a + b
'''
    )

    analyzer = ASTAnalyzer()
    analysis = analyzer.analyze([source])

    checker = DocumentationChecker()
    result = checker.check(analysis)

    assert len(result.issues) == 0
