"""Documentation metrics derived from Core AI pipeline results."""

from core_ai.models.pipelines import PipelineResult


def calculate_documentation_metrics(
    result: PipelineResult,
) -> dict[str, int]:
    """Calculate dashboard documentation metrics from a pipeline result."""

    docstrings_count = 0
    comments_count = 0

    if result.ai_result is not None:
        docstrings_count = sum(
            1
            for change in result.ai_result.changes
            if change.type == "docstring"
        )

        comments_count = sum(
            1
            for change in result.ai_result.changes
            if change.type == "comment"
        )

    readme_count = (
        1
        if (
            result.ai_result is not None
            and result.ai_result.documentation.readme is not None
        )
        else 0
    )

    functions_count = sum(
        len(file_analysis.functions)
        for file_analysis in result.analysis.files
    )

    classes_count = sum(
        len(file_analysis.classes)
        for file_analysis in result.analysis.files
    )

    methods_count = sum(
        len(class_analysis.methods)
        for file_analysis in result.analysis.files
        for class_analysis in file_analysis.classes
    )

    modules_count = len(result.analysis.files)

    return {
        "docstrings_count": docstrings_count,
        "comments_count": comments_count,
        "readme_count": readme_count,
        "functions_count": functions_count,
        "classes_count": classes_count,
        "methods_count": methods_count,
        "modules_count": modules_count,
    }
