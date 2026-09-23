from models.scanner import SourceFile
from ast_analyzer import ASTAnalyzer
from documentation_checker import DocumentationChecker


source = SourceFile(
    path="app.py",
    language="python",
    content='''
def documented_function(value):
    """This function is documented."""
    return value


def undocumented_function(value):
    return value * 2


def _private_function(value):
    return value


class Calculator:
    """Calculator class."""

    def add(self, a, b):
        return a + b

    def documented_method(self, value):
        """This method is documented."""
        return value

    def _private_method(self):
        return 10
'''
)


# Step 1: AST analysis
analyzer = ASTAnalyzer()
analysis = analyzer.analyze([source])


# Step 2: Documentation check
checker = DocumentationChecker()
result = checker.check(analysis)


print("\n--- DOCUMENTATION ISSUES ---")

for issue in result.issues:
    print(
        f"{issue.file}"
        f" | {issue.target}"
        f" | type={issue.type}"
        f" | line={issue.line}"
        f" | issue={issue.issue}"
    )


print("\n--- TOTAL ISSUES ---")
print(len(result.issues))