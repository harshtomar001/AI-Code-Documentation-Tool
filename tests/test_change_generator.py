from core_ai.ai.change_generator import ChangeGenerator
from core_ai.models.analysis import (
    AnalysisResult,
    ClassAnalysis,
    FileAnalysis,
    FunctionAnalysis,
    MethodAnalysis,
)
from core_ai.models.documentation import (
    DocumentationChange,
    DocumentationFile,
    DocumentationResult,
)
from core_ai.models.security import SanitizedFile


def test_existing_docstring_is_replaced():
    source = '''def calculate_discount(price, premium):
    """
    Old documentation.

    price: original price
    """
    if premium:
        return price * 0.8

    return price
'''

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[
                    FunctionAnalysis(
                        name="calculate_discount",
                        line_start=1,
                        line_end=9,
                        parameters=["price", "premium"],
                        has_docstring=True,
                        is_public=True,
                    )
                ],
                classes=[],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="calculate_discount",
                        content=(
                            "Calculate discount based on premium status.\n\n"
                            "Args:\n"
                            "    price: Original price.\n"
                            "    premium: Whether the user is premium."
                        ),
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(documentation, analysis, files)

    assert len(changes) == 1
    assert "Calculate discount based on premium status." in changes[0].after
    assert "Old documentation." not in changes[0].after
    assert changes[0].after.count('"""') == 2


def test_missing_docstring_is_inserted():
    source = """def calculate_discount(price, premium):
    if premium:
        return price * 0.8

    return price
"""

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[
                    FunctionAnalysis(
                        name="calculate_discount",
                        line_start=1,
                        line_end=5,
                        parameters=["price", "premium"],
                        has_docstring=False,
                        is_public=True,
                    )
                ],
                classes=[],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="calculate_discount",
                        content="Calculate discount based on premium status.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(documentation, analysis, files)

    assert len(changes) == 1
    assert "Calculate discount based on premium status." in changes[0].after
    assert "if premium:" in changes[0].after
    assert "return price * 0.8" in changes[0].after
    assert changes[0].after.count('"""') == 2


def test_non_docstring_change_is_ignored():
    source = """def hello():
    return "hello"
"""

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[
                    FunctionAnalysis(
                        name="hello",
                        line_start=1,
                        line_end=2,
                        parameters=[],
                        has_docstring=False,
                        is_public=True,
                    )
                ],
                classes=[],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="comment",
                        target="hello",
                        content="This is a comment.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(documentation, analysis, files)

    assert changes == []


def test_missing_source_file_is_ignored():
    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[],
                classes=[],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="missing.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="hello",
                        content="Say hello.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(
        documentation,
        analysis,
        [],
    )

    assert changes == []


def test_missing_analysis_file_is_ignored():
    source = """def hello():
    return "hello"
"""

    files = [SanitizedFile(path="app.py", content=source)]

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="hello",
                        content="Say hello.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(
        documentation,
        AnalysisResult(files=[]),
        files,
    )

    assert changes == []


def test_missing_target_is_ignored():
    source = """def hello():
    return "hello"
"""

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[],
                classes=[],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="missing_function",
                        content="Missing function.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(
        documentation,
        analysis,
        files,
    )

    assert changes == []


def test_class_target_is_found():
    source = """class Calculator:
    pass
"""

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[],
                classes=[
                    ClassAnalysis(
                        name="Calculator",
                        line_start=1,
                        line_end=2,
                        has_docstring=False,
                        is_public=True,
                        methods=[],
                    )
                ],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="Calculator",
                        content="Perform calculations.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(
        documentation,
        analysis,
        files,
    )

    assert len(changes) == 1
    assert "Perform calculations." in changes[0].after


def test_method_target_is_found():
    source = """class Calculator:
    def add(self, a, b):
        return a + b
"""

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[],
                classes=[
                    ClassAnalysis(
                        name="Calculator",
                        line_start=1,
                        line_end=3,
                        has_docstring=False,
                        is_public=True,
                        methods=[
                            MethodAnalysis(
                                name="add",
                                line_start=2,
                                line_end=3,
                                parameters=["self", "a", "b"],
                                has_docstring=False,
                                is_public=True,
                            )
                        ],
                    )
                ],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="add",
                        content="Add two numbers.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(
        documentation,
        analysis,
        files,
    )

    assert len(changes) == 1
    assert "Add two numbers." in changes[0].after


def test_multiline_docstring_is_inserted():
    source = """def hello():
    return "hello"
"""

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[
                    FunctionAnalysis(
                        name="hello",
                        line_start=1,
                        line_end=2,
                        parameters=[],
                        has_docstring=False,
                        is_public=True,
                    )
                ],
                classes=[],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="hello",
                        content="Say hello.\n\nReturns:\n    A greeting.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(
        documentation,
        analysis,
        files,
    )

    after = changes[0].after

    assert "Say hello." in after
    assert "Returns:" in after
    assert "A greeting." in after
    assert after.count('"""') == 2


def test_single_quote_docstring_is_replaced():
    source = """def hello():
    '''Old documentation.'''
    return "hello"
"""

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[
                    FunctionAnalysis(
                        name="hello",
                        line_start=1,
                        line_end=3,
                        parameters=[],
                        has_docstring=True,
                        is_public=True,
                    )
                ],
                classes=[],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="hello",
                        content="New documentation.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(
        documentation,
        analysis,
        files,
    )

    after = changes[0].after

    assert "New documentation." in after
    assert "Old documentation." not in after


def test_existing_docstring_after_blank_lines_is_replaced():
    source = """def hello():


    '''Old documentation.'''
    return "hello"
"""

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[
                    FunctionAnalysis(
                        name="hello",
                        line_start=1,
                        line_end=5,
                        parameters=[],
                        has_docstring=True,
                        is_public=True,
                    )
                ],
                classes=[],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="hello",
                        content="New documentation.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(
        documentation,
        analysis,
        files,
    )

    after = changes[0].after

    assert "New documentation." in after
    assert "Old documentation." not in after


def test_empty_source_returns_empty_string():
    generator = ChangeGenerator()

    result = generator._insert_docstring(
        source="",
        line_start=1,
        content="Documentation.",
    )

    assert result == ""


def test_docstring_change_contains_before_after_metadata():
    source = """def hello():
    return "hello"
"""

    files = [SanitizedFile(path="app.py", content=source)]

    analysis = AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[
                    FunctionAnalysis(
                        name="hello",
                        line_start=1,
                        line_end=2,
                        parameters=[],
                        has_docstring=False,
                        is_public=True,
                    )
                ],
                classes=[],
            )
        ]
    )

    documentation = DocumentationResult(
        files=[
            DocumentationFile(
                path="app.py",
                changes=[
                    DocumentationChange(
                        type="docstring",
                        target="hello",
                        content="Say hello.",
                    )
                ],
            )
        ]
    )

    changes = ChangeGenerator().generate(
        documentation,
        analysis,
        files,
    )

    change = changes[0]

    assert change.file == "app.py"
    assert change.target == "hello"
    assert change.type == "docstring"
    assert "def hello():" in change.before
    assert "Say hello." in change.after
