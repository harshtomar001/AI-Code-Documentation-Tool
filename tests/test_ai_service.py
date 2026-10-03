from core_ai.ai.service import AIService
from core_ai.models.analysis import (
    AnalysisResult,
    ClassAnalysis,
    FileAnalysis,
    MethodAnalysis,
)
from core_ai.models.documentation import DocumentationResult
from core_ai.models.input import AIInput, RepositoryInfo
from core_ai.models.security import SanitizedFile, SecurityResult


class FakeProvider:
    def generate(self, prompt: str) -> str:
        return '{"files": [], "readme": null}'


class FakeContextBuilder:
    def __init__(self):
        self.calls = []

    def build(self, data):
        self.calls.append(data)
        return "test context"


class FakePromptBuilder:
    def build(self, context: str) -> str:
        return context


class FakeOutputParser:
    def parse(self, response: str) -> DocumentationResult:
        return DocumentationResult(files=[], readme=None)


class FakeChangeGenerator:
    def __init__(self):
        self.calls = []

    def generate(self, documentation, analysis, files):
        self.calls.append(
            {
                "documentation": documentation,
                "analysis": analysis,
                "files": files,
            }
        )
        return []


def build_service():
    context_builder = FakeContextBuilder()
    change_generator = FakeChangeGenerator()

    service = AIService(
        provider=FakeProvider(),
        context_builder=context_builder,
        prompt_builder=FakePromptBuilder(),
        output_parser=FakeOutputParser(),
        change_generator=change_generator,
    )

    return service, context_builder, change_generator


def build_analysis():
    methods = [
        MethodAnalysis(
            name="method_one",
            line_start=3,
            line_end=5,
            parameters=["self"],
            has_docstring=False,
            is_public=True,
        ),
        MethodAnalysis(
            name="method_two",
            line_start=6,
            line_end=8,
            parameters=["self"],
            has_docstring=False,
            is_public=True,
        ),
        MethodAnalysis(
            name="method_three",
            line_start=9,
            line_end=11,
            parameters=["self"],
            has_docstring=False,
            is_public=True,
        ),
    ]

    class_analysis = ClassAnalysis(
        name="Example",
        line_start=1,
        line_end=11,
        has_docstring=False,
        is_public=True,
        methods=methods,
    )

    file_analysis = FileAnalysis(
        path="example.py",
        language="python",
        functions=[],
        classes=[class_analysis],
    )

    return AnalysisResult(files=[file_analysis])


def build_input(analysis):
    source = """class Example:
    pass

    def method_one(self):
        return 1

    def method_two(self):
        return 2

    def method_three(self):
        return 3
"""

    return AIInput(
        repository=RepositoryInfo(
            name="test_repository",
            files=["example.py"],
        ),
        analysis=analysis,
        security=SecurityResult(),
        files=[
            SanitizedFile(
                path="example.py",
                content=source,
            )
        ],
    )


def test_generate_batch_result_filters_class_methods_by_target_range():
    service, context_builder, change_generator = build_service()

    analysis = build_analysis()
    data = build_input(analysis)

    chunk_one = SanitizedFile(
        path="example.py",
        content=(
            "class Example:\n"
            "    pass\n"
            "\n"
            "    def method_one(self):\n"
            "        return 1\n"
            "\n"
            "    def method_two(self):\n"
            "        return 2\n"
        ),
        start_line=1,
        end_line=8,
        target_start_line=3,
        target_end_line=8,
    )

    service.generate_batch_result(
        data,
        [chunk_one],
    )

    assert len(context_builder.calls) == 1

    filtered_analysis = context_builder.calls[0].analysis

    assert len(filtered_analysis.files) == 1

    filtered_class = filtered_analysis.files[0].classes[0]

    assert filtered_class.name == "Example"

    assert [
        method.name
        for method in filtered_class.methods
    ] == [
        "method_one",
        "method_two",
    ]

    assert "method_three" not in [
        method.name
        for method in filtered_class.methods
    ]


def test_generate_batch_result_keeps_only_method_three_for_second_chunk():
    service, context_builder, change_generator = build_service()

    analysis = build_analysis()
    data = build_input(analysis)

    chunk_two = SanitizedFile(
        path="example.py",
        content=(
            "class Example:\n"
            "    pass\n"
            "\n"
            "    def method_three(self):\n"
            "        return 3\n"
        ),
        start_line=1,
        end_line=11,
        target_start_line=9,
        target_end_line=11,
    )

    service.generate_batch_result(
        data,
        [chunk_two],
    )

    assert len(context_builder.calls) == 1

    filtered_analysis = context_builder.calls[0].analysis

    assert len(filtered_analysis.files) == 1

    filtered_class = filtered_analysis.files[0].classes[0]

    assert filtered_class.name == "Example"

    assert [
        method.name
        for method in filtered_class.methods
    ] == [
        "method_three",
    ]


def test_generate_batch_result_passes_complete_original_file_to_change_generator():
    service, context_builder, change_generator = build_service()

    analysis = build_analysis()
    data = build_input(analysis)

    chunk = SanitizedFile(
        path="example.py",
        content=(
            "class Example:\n"
            "    pass\n"
            "\n"
            "    def method_three(self):\n"
            "        return 3\n"
        ),
        start_line=1,
        end_line=11,
        target_start_line=9,
        target_end_line=11,
    )

    service.generate_batch_result(
        data,
        [chunk],
    )

    assert len(change_generator.calls) == 1

    original_files = change_generator.calls[0]["files"]

    assert len(original_files) == 1
    assert original_files[0].path == "example.py"
    assert original_files[0].start_line is None
    assert original_files[0].end_line is None
