from core_ai.ai.context_builder import ContextBuilder
from core_ai.models.analysis import (
    AnalysisResult,
    ClassAnalysis,
    FileAnalysis,
    FunctionAnalysis,
    MethodAnalysis,
)
from core_ai.models.input import (
    AIInput,
    RepositoryInfo,
)
from core_ai.models.security import (
    SanitizedFile,
    SecurityFinding,
    SecurityResult,
)


def test_context_builder_includes_repository_analysis_security_and_source():
    data = AIInput(
        repository=RepositoryInfo(
            name="demo-project",
            files=["app.py", "utils.py"],
        ),
        analysis=AnalysisResult(
            files=[
                FileAnalysis(
                    path="app.py",
                    language="python",
                    functions=[
                        FunctionAnalysis(
                            name="calculate",
                            line_start=1,
                            line_end=5,
                            parameters=["price", "tax"],
                            has_docstring=False,
                            is_public=True,
                        )
                    ],
                    classes=[
                        ClassAnalysis(
                            name="Calculator",
                            line_start=7,
                            line_end=20,
                            has_docstring=True,
                            is_public=True,
                            methods=[
                                MethodAnalysis(
                                    name="run",
                                    line_start=10,
                                    line_end=15,
                                    parameters=["value"],
                                    has_docstring=True,
                                    is_public=True,
                                )
                            ],
                        )
                    ],
                )
            ]
        ),
        security=SecurityResult(
            safe_for_ai=False,
            findings=[
                SecurityFinding(
                    type="secret",
                    category="api_key",
                    file="app.py",
                    line=3,
                    redacted=True,
                )
            ],
        ),
        files=[
            SanitizedFile(
                path="app.py",
                content='print("sanitized")',
            )
        ],
    )

    context = ContextBuilder().build(data)

    assert "## Repository" in context
    assert "Name: demo-project" in context
    assert "- app.py" in context
    assert "- utils.py" in context

    assert "## Code Analysis" in context
    assert "File: app.py" in context
    assert "Language: python" in context
    assert "calculate(price, tax)" in context
    assert "Calculator" in context
    assert "run(value)" in context
    assert "[public=True]" in context
    assert "[docstring=False]" in context

    assert "## Security" in context
    assert "Safe for AI: False" in context
    assert "secret: api_key in app.py line 3" in context

    assert "## Sanitized Source Code" in context
    assert "--- app.py ---" in context
    assert 'print("sanitized")' in context


def test_context_builder_handles_empty_analysis_security_and_files():
    data = AIInput(
        repository=RepositoryInfo(
            name="empty-project",
            files=[],
        ),
        analysis=AnalysisResult(files=[]),
        security=SecurityResult(
            safe_for_ai=True,
            findings=[],
        ),
        files=[],
    )

    context = ContextBuilder().build(data)

    assert "Name: empty-project" in context
    assert "## Code Analysis" in context
    assert "## Security" in context
    assert "Safe for AI: True" in context
    assert "## Sanitized Source Code" in context
    assert "Redacted findings:" not in context
