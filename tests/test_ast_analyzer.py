from core_ai.ast_analyzer import ASTAnalyzer
from core_ai.models.scanner import SourceFile


def test_ast_analyzer_analyzes_python_file():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="""
def hello(name):
    return f"Hello {name}"
""",
    )
    result = ASTAnalyzer().analyze([source])
    assert result is not None
    assert len(result.files) == 1
    assert result.files[0].path == "sample.py"
    assert result.files[0].language == "python"


def test_ast_analyzer_detects_function():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="""
def hello(name):
    return f"Hello {name}"
""",
    )
    result = ASTAnalyzer().analyze([source])
    function = result.files[0].functions[0]

    assert function.name == "hello"
    assert function.parameters == ["name"]
    assert function.has_docstring is False
    assert function.is_public is True


def test_ast_analyzer_detects_documented_function():
    source = SourceFile(
        path="sample.py",
        language="python",
        content='''
def hello(name):
    """Return a greeting."""
    return f"Hello {name}"
''',
    )
    result = ASTAnalyzer().analyze([source])
    function = result.files[0].functions[0]

    assert function.has_docstring is True


def test_ast_analyzer_detects_async_function():
    source = SourceFile(
        path="async_sample.py",
        language="python",
        content="""
async def fetch_data(url):
    return url
""",
    )
    result = ASTAnalyzer().analyze([source])
    function = result.files[0].functions[0]

    assert function.name == "fetch_data"
    assert function.parameters == ["url"]


def test_ast_analyzer_detects_class_and_methods():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="""
class Calculator:
    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b
""",
    )
    result = ASTAnalyzer().analyze([source])
    calculator = result.files[0].classes[0]

    assert calculator.name == "Calculator"
    assert calculator.has_docstring is False
    assert calculator.is_public is True
    assert len(calculator.methods) == 2

    assert calculator.methods[0].name == "add"
    assert calculator.methods[0].parameters == ["self", "a", "b"]

    assert calculator.methods[1].name == "subtract"
    assert calculator.methods[1].parameters == ["self", "a", "b"]


def test_ast_analyzer_detects_documented_class_and_method():
    source = SourceFile(
        path="sample.py",
        language="python",
        content='''
class Calculator:
    """Perform calculations."""

    def add(self, a, b):
        """Add two numbers."""
        return a + b
''',
    )
    result = ASTAnalyzer().analyze([source])

    calculator = result.files[0].classes[0]
    method = calculator.methods[0]

    assert calculator.has_docstring is True
    assert method.has_docstring is True


def test_ast_analyzer_detects_private_function_and_class():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="""
def _private_function():
    pass


class _PrivateClass:
    def _private_method(self):
        pass
""",
    )
    result = ASTAnalyzer().analyze([source])

    function = result.files[0].functions[0]
    private_class = result.files[0].classes[0]
    method = private_class.methods[0]

    assert function.is_public is False
    assert private_class.is_public is False
    assert method.is_public is False


def test_ast_analyzer_tracks_line_ranges():
    source = SourceFile(
        path="sample.py",
        language="python",
        content="""


def hello(name):
    message = f"Hello {name}"
    return message


class Calculator:
    def add(self, a, b):
        return a + b
""",
    )
    result = ASTAnalyzer().analyze([source])

    function = result.files[0].functions[0]
    calculator = result.files[0].classes[0]
    method = calculator.methods[0]

    assert function.line_start == 4
    assert function.line_end == 6
    assert calculator.line_start == 9
    assert calculator.line_end == 11
    assert method.line_start == 10
    assert method.line_end == 11


def test_ast_analyzer_skips_non_python_files():
    source = SourceFile(
        path="README.md",
        language="markdown",
        content="# Documentation",
    )
    result = ASTAnalyzer().analyze([source])

    assert result.files == []


def test_ast_analyzer_skips_invalid_python():
    source = SourceFile(
        path="broken.py",
        language="python",
        content="""
def broken(
    return 123
""",
    )
    result = ASTAnalyzer().analyze([source])

    assert result.files == []


def test_ast_analyzer_handles_python_file_without_functions_or_classes():
    source = SourceFile(
        path="constants.py",
        language="python",
        content="""
PI = 3.14159
NAME = "demo"
""",
    )
    result = ASTAnalyzer().analyze([source])

    assert len(result.files) == 1
    assert result.files[0].functions == []
    assert result.files[0].classes == []


def test_ast_analyzer_handles_empty_file():
    source = SourceFile(
        path="empty.py",
        language="python",
        content="",
    )
    result = ASTAnalyzer().analyze([source])

    assert len(result.files) == 1
    assert result.files[0].functions == []
    assert result.files[0].classes == []
