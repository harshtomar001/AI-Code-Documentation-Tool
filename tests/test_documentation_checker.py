from core_ai.ast_analyzer import ASTAnalyzer
from core_ai.documentation_checker import DocumentationChecker
from core_ai.models.scanner import SourceFile


def analyze(source: str):
    source_file = SourceFile(
        path="sample.py",
        language="python",
        content=source,
    )
    return ASTAnalyzer().analyze([source_file])


def test_detects_undocumented_public_function():
    analysis = analyze("""
def calculate(a, b):
    return a + b
""")

    result = DocumentationChecker().check(analysis)

    assert len(result.issues) == 1

    issue = result.issues[0]

    assert issue.file == "sample.py"
    assert issue.target == "calculate"
    assert issue.type == "function"
    assert issue.line == 2
    assert issue.issue == "undocumented"


def test_does_not_flag_documented_public_function():
    analysis = analyze('''
def calculate(a, b):
    """Calculate the sum of two numbers."""
    return a + b
''')

    result = DocumentationChecker().check(analysis)

    assert result.issues == []


def test_does_not_flag_private_undocumented_function():
    analysis = analyze("""
def _calculate(a, b):
    return a + b
""")

    result = DocumentationChecker().check(analysis)

    assert result.issues == []


def test_detects_undocumented_public_class():
    analysis = analyze("""
class Calculator:
    def add(self, a, b):
        return a + b
""")

    result = DocumentationChecker().check(analysis)

    assert len(result.issues) == 2

    class_issue = next(issue for issue in result.issues if issue.type == "class")

    assert class_issue.file == "sample.py"
    assert class_issue.target == "Calculator"
    assert class_issue.type == "class"
    assert class_issue.line == 2
    assert class_issue.issue == "undocumented"


def test_does_not_flag_documented_public_class():
    analysis = analyze('''
class Calculator:
    """Perform calculations."""

    def add(self, a, b):
        """Add two numbers."""
        return a + b
''')

    result = DocumentationChecker().check(analysis)

    assert result.issues == []


def test_private_class_itself_is_not_flagged_but_public_method_is():
    analysis = analyze("""
class _Calculator:
    def add(self, a, b):
        return a + b
""")

    result = DocumentationChecker().check(analysis)

    assert len(result.issues) == 1
    assert result.issues[0].target == "_Calculator.add"
    assert result.issues[0].type == "method"


def test_detects_undocumented_public_method():
    analysis = analyze('''
class Calculator:
    """Perform calculations."""

    def add(self, a, b):
        return a + b
''')

    result = DocumentationChecker().check(analysis)

    assert len(result.issues) == 1

    issue = result.issues[0]

    assert issue.file == "sample.py"
    assert issue.target == "Calculator.add"
    assert issue.type == "method"
    assert issue.line == 5
    assert issue.issue == "undocumented"


def test_does_not_flag_private_undocumented_method():
    analysis = analyze("""
class Calculator:
    def _add(self, a, b):
        return a + b
""")

    result = DocumentationChecker().check(analysis)

    assert len(result.issues) == 1

    issue = result.issues[0]

    assert issue.type == "class"
    assert issue.target == "Calculator"


def test_detects_multiple_documentation_issues():
    analysis = analyze("""
def public_function():
    pass


def _private_function():
    pass


class PublicClass:
    def public_method(self):
        pass

    def _private_method(self):
        pass


class _PrivateClass:
    def public_method(self):
        pass
""")

    result = DocumentationChecker().check(analysis)

    targets = {issue.target for issue in result.issues}

    assert targets == {
        "public_function",
        "PublicClass",
        "PublicClass.public_method",
        "_PrivateClass.public_method",
    }


def test_empty_analysis_has_no_issues():
    from core_ai.models.analysis import AnalysisResult

    result = DocumentationChecker().check(AnalysisResult(files=[]))

    assert result.issues == []
