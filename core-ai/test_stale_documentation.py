from models.scanner import SourceFile

from ast_analyzer import ASTAnalyzer
from stale_documentation import StaleDocumentationDetector


source = SourceFile(
    path="app.py",
    language="python",
    content='''
def correct_function(price, tax):
    """
    Calculate total.

    price: product price
    tax: tax amount
    """
    return price + tax


def stale_function(price, tax):
    """
    Calculate total.

    price: product price
    """
    return price + tax


def no_docstring_function(price, tax):
    return price + tax


class Calculator:

    def stale_method(self, value, multiplier):
        """
        Calculate result.

        value: input value
        """
        return value * multiplier
'''
)


# Step 1: AST analysis
analyzer = ASTAnalyzer()
analysis = analyzer.analyze([source])


# Step 2: Detect stale documentation
detector = StaleDocumentationDetector()

result = detector.detect(
    analysis,
    [source]
)


print("\n--- STALE DOCUMENTATION ---")

for issue in result.issues:

    print(
        f"{issue.file}"
        f" | {issue.target}"
        f" | type={issue.type}"
        f" | line={issue.line}"
        f" | issue={issue.issue}"
    )

    print(
        f"  details: {issue.details}"
    )


print("\n--- TOTAL ---")
print(len(result.issues))