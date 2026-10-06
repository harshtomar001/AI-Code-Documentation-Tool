from core_ai.ast_analyzer import ASTAnalyzer
from core_ai.models.analysis import AnalysisResult
from core_ai.models.scanner import SourceFile
from core_ai.stale_documentation import StaleDocumentationDetector


def make_source(content):
    return SourceFile(
        path="sample.py",
        language="python",
        content=content,
    )


def analyze(source):
    return ASTAnalyzer().analyze([source])


def test_stale_documentation_detector_runs():
    source = make_source(
        "def calculate(a, b):\n"
        '    """Calculate the sum.\n'
        "\n"
        "    Args:\n"
        "        a: First number.\n"
        "        b: Second number.\n"
        '    """\n'
        "    return a + b\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert result.issues == []


def test_detects_stale_parameter_documentation():
    source = make_source(
        "def calculate(a, b):\n"
        '    """Calculate the sum.\n'
        "\n"
        "    Args:\n"
        "        a: First number.\n"
        "        b: Second number.\n"
        "        old_value: Previously used number.\n"
        '    """\n'
        "    return a + b\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert len(result.issues) == 1
    assert result.issues[0].target == "calculate"
    assert result.issues[0].type == "function"
    assert "old_value" in result.issues[0].details


def test_does_not_flag_when_all_parameters_are_documented():
    source = make_source(
        "def calculate(a, b):\n"
        '    """Calculate the sum.\n'
        "\n"
        "    Args:\n"
        "        a: First number.\n"
        "        b: Second number.\n"
        '    """\n'
        "    return a + b\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert result.issues == []


def test_excludes_self_and_cls_from_parameters():
    source = make_source(
        "class Calculator:\n"
        "    def add(self, a):\n"
        '        """Add a number.\n'
        "\n"
        "        Args:\n"
        "            a: Number to add.\n"
        '        """\n'
        "        return a\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert result.issues == []


def test_detects_stale_method_documentation():
    source = make_source(
        "class Calculator:\n"
        "    def add(self, a, b):\n"
        '        """Add two numbers.\n'
        "\n"
        "        Args:\n"
        "            a: First number.\n"
        "            b: Second number.\n"
        "            old_value: Removed parameter.\n"
        '        """\n'
        "        return a + b\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert len(result.issues) == 1
    assert result.issues[0].target == "add"
    assert result.issues[0].type == "method"
    assert "old_value" in result.issues[0].details


def test_detects_async_function():
    source = make_source(
        "async def fetch(url, timeout):\n"
        '    """Fetch data.\n'
        "\n"
        "    Args:\n"
        "        url: Resource URL.\n"
        "        timeout: Request timeout.\n"
        "        old_url: Removed URL.\n"
        '    """\n'
        "    return url\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert len(result.issues) == 1
    assert result.issues[0].target == "fetch"
    assert result.issues[0].type == "function"
    assert "old_url" in result.issues[0].details


def test_ignores_private_function():
    source = make_source(
        'def _calculate(a, b):\n'
        '    """Private calculation.\n'
        "\n"
        "    Args:\n"
        "        old_value: Removed parameter.\n"
        '    """\n'
        "    return a + b\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert result.issues == []


def test_ignores_undocumented_function():
    source = make_source(
        "def calculate(a, b):\n"
        "    return a + b\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert result.issues == []


def test_analysis_file_without_source_is_ignored():
    analysis_source = make_source(
        "def hello(a):\n"
        '    """Say hello.\n'
        "\n"
        "    Args:\n"
        "        a: Name.\n"
        '    """\n'
        "    return a\n"
    )

    other_source = SourceFile(
        path="other.py",
        language="python",
        content="def hello():\n    pass\n",
    )

    analysis = analyze(analysis_source)

    result = StaleDocumentationDetector().detect(
        analysis,
        [other_source],
    )

    assert result.issues == []


def test_invalid_python_source_is_ignored():
    source = make_source(
        "def broken(\n"
        "    return 123\n"
    )

    analysis = AnalysisResult(
        files=[
            {
                "path": "sample.py",
                "language": "python",
                "functions": [],
                "classes": [],
            }
        ]
    )

    result = StaleDocumentationDetector().detect(
        analysis,
        [source],
    )

    assert result.issues == []


def test_star_parameter_documentation_is_recognized():
    source = make_source(
        "def collect(items, options):\n"
        '    """Collect values.\n'
        "\n"
        "    Args:\n"
        "        *items: Values to collect.\n"
        "        options: Collection options.\n"
        '    """\n'
        "    return items\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert result.issues == []


def test_invalid_docstring_ast_is_handled():
    detector = StaleDocumentationDetector()

    result = detector._extract_documented_parameters(
        'broken """ documentation'
    )

    assert result == set()


def test_extract_documented_parameters_handles_star_prefixes():
    detector = StaleDocumentationDetector()

    result = detector._extract_documented_parameters(
        "Args:\n"
        "    a: First value.\n"
        "    **kwargs: Additional options.\n"
        "    *args: Positional values.\n"
    )

    assert "a" in result
    assert "kwargs" in result
    assert "args" in result


def test_extract_documented_parameters_ignores_non_identifier():
    detector = StaleDocumentationDetector()

    result = detector._extract_documented_parameters(
        "Args:\n"
        "    not-valid-name: Invalid parameter.\n"
        "    123: Invalid parameter.\n"
        "    valid_name: Valid parameter.\n"
    )

    assert result == {"valid_name"}


def test_private_method_is_ignored():
    source = make_source(
        "class Calculator:\n"
        "    def _add(self, a, b):\n"
        '        """Add numbers.\n'
        "\n"
        "        Args:\n"
        "            old_value: Removed parameter.\n"
        '        """\n'
        "        return a + b\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert result.issues == []


def test_cls_is_excluded_from_parameters():
    source = make_source(
        "class Calculator:\n"
        "    @classmethod\n"
        "    def add(cls, a):\n"
        '        """Add a number.\n'
        "\n"
        "        Args:\n"
        "            a: Number to add.\n"
        '        """\n'
        "        return a\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert result.issues == []


def test_top_level_function_is_detected_as_function():
    source = make_source(
        "def calculate(a):\n"
        '    """Calculate.\n'
        "\n"
        "    Args:\n"
        "        a: Number.\n"
        "        old_value: Removed parameter.\n"
        '    """\n'
        "    return a\n"
    )

    result = StaleDocumentationDetector().detect(
        analyze(source),
        [source],
    )

    assert len(result.issues) == 1
    assert result.issues[0].target == "calculate"
    assert result.issues[0].type == "function"
    assert "old_value" in result.issues[0].details
