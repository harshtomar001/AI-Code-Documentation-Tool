from core_ai.models.scanner import SourceFile
from core_ai.ast_analyzer import ASTAnalyzer
from core_ai.stale_documentation import StaleDocumentationDetector


def test_stale_documentation_detector_runs():
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

    detector = StaleDocumentationDetector()
    result = detector.detect(analysis, [source])

    assert result is not None


def test_stale_documentation_detector_handles_undocumented_function():
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

    detector = StaleDocumentationDetector()
    result = detector.detect(analysis, [source])

    assert result is not None
