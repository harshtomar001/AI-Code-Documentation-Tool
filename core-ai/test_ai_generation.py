from models.input import (
    AIInput,
    RepositoryInfo
)

from models.analysis import (
    AnalysisResult,
    FileAnalysis,
    FunctionAnalysis
)

from models.security import (
    SecurityResult,
    SanitizedFile
)

from ai.context_builder import ContextBuilder
from ai.prompt_builder import DocumentationPromptBuilder
from ai.provider_factory import ProviderFactory
from ai.service import AIService


data = AIInput(
    repository=RepositoryInfo(
        name="test-project",
        files=["app.py"]
    ),

    analysis=AnalysisResult(
        files=[
            FileAnalysis(
                path="app.py",
                language="python",
                functions=[
                    FunctionAnalysis(
                        name="calculate_discount",
                        line_start=1,
                        line_end=4,
                        parameters=["price", "premium"],
                        has_docstring=False,
                        is_public=True
                    )
                ]
            )
        ]
    ),

    security=SecurityResult(
        safe_for_ai=True,
        findings=[]
    ),

    files=[
        SanitizedFile(
            path="app.py",
            content="""def calculate_discount(price, premium):
    if premium:
        return price * 0.8

    return price
"""
        )
    ]
)


provider = ProviderFactory.create()

service = AIService(
    provider=provider,
    context_builder=ContextBuilder(),
    prompt_builder=DocumentationPromptBuilder()
)

response = service.generate_documentation(data)

print("\n--- AI RESPONSE ---")
print(response)
print("\n--- END RESPONSE ---")