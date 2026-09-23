from ai.change_generator import ChangeGenerator
from models.analysis import (
    AnalysisResult,
    FileAnalysis,
    FunctionAnalysis,
)
from models.documentation import (
    DocumentationResult,
    DocumentationFile,
    DocumentationChange,
)
from models.security import SanitizedFile


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

    files = [
        SanitizedFile(
            path="app.py",
            content=source
        )
    ]

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
                        is_public=True
                    )
                ],
                classes=[]
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
                        )
                    )
                ]
            )
        ]
    )

    generator = ChangeGenerator()

    changes = generator.generate(
        documentation,
        analysis,
        files
    )

    assert len(changes) == 1

    after = changes[0].after

    # New documentation exists.
    assert "Calculate discount based on premium status." in after

    # Old documentation was removed.
    assert "Old documentation." not in after

    # There should only be one docstring.
    assert after.count('"""') == 2

def test_missing_docstring_is_inserted():

    source = '''def calculate_discount(price, premium):
    if premium:
        return price * 0.8

    return price
'''

    files = [
        SanitizedFile(
            path="app.py",
            content=source
        )
    ]

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
                        is_public=True
                    )
                ],
                classes=[]
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
                        )
                    )
                ]
            )
        ]
    )

    generator = ChangeGenerator()

    changes = generator.generate(
        documentation,
        analysis,
        files
    )

    assert len(changes) == 1

    after = changes[0].after

    # New documentation was inserted.
    assert "Calculate discount based on premium status." in after

    # Original function body is still present.
    assert "if premium:" in after
    assert "return price * 0.8" in after

    # Exactly one docstring was added.
    assert after.count('"""') == 2



if __name__ == "__main__":
    test_existing_docstring_is_replaced()
    print("PASS: existing docstring is replaced")

    test_missing_docstring_is_inserted()
    print("PASS: missing docstring is inserted")