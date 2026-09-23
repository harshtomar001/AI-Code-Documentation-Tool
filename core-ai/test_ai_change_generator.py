from models.analysis import (
    AnalysisResult,
    FileAnalysis,
    FunctionAnalysis
)

from models.documentation import (
    DocumentationResult,
    DocumentationFile,
    DocumentationChange
)

from models.security import SanitizedFile

from ai.change_generator import ChangeGenerator


analysis = AnalysisResult(
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
)


documentation = DocumentationResult(
    files=[
        DocumentationFile(
            path="app.py",
            changes=[
                DocumentationChange(
                    type="docstring",
                    target="calculate_discount",
                    content="Calculate the discounted price based on premium status."
                )
            ]
        )
    ]
)


files = [
    SanitizedFile(
        path="app.py",
        content="""def calculate_discount(price, premium):
    if premium:
        return price * 0.8
    return price"""
    )
]


generator = ChangeGenerator()

changes = generator.generate(
    documentation,
    analysis,
    files
)


print("\n--- NUMBER OF CHANGES ---")
print(len(changes))

print("\n--- BEFORE ---")
print(changes[0].before)

print("\n--- AFTER ---")
print(changes[0].after)

print("\n--- TARGET ---")
print(changes[0].target)