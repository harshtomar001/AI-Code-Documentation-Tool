from models.scanner import SourceFile

from ast_analyzer import ASTAnalyzer


source = SourceFile(
    path="app.py",
    language="python",
    content="""
def calculate_discount(price, premium):
    if premium:
        return price * 0.8
    return price


def _internal_helper(value):
    return value * 2


class Calculator:

    def add(self, a, b):
        return a + b

    def _internal_method(self):
        return 10
"""
)


analyzer = ASTAnalyzer()

result = analyzer.analyze([source])


print("\n--- ANALYSIS ---")

for file in result.files:

    print(f"\nFILE: {file.path}")
    print(f"LANGUAGE: {file.language}")

    print("\nFUNCTIONS:")

    for function in file.functions:
        print(
            f"  {function.name}"
            f" | lines {function.line_start}-{function.line_end}"
            f" | params={function.parameters}"
            f" | public={function.is_public}"
            f" | docstring={function.has_docstring}"
        )

    print("\nCLASSES:")

    for cls in file.classes:

        print(
            f"  {cls.name}"
            f" | lines {cls.line_start}-{cls.line_end}"
            f" | public={cls.is_public}"
            f" | docstring={cls.has_docstring}"
        )

        for method in cls.methods:

            print(
                f"    {method.name}"
                f" | lines {method.line_start}-{method.line_end}"
                f" | params={method.parameters}"
                f" | public={method.is_public}"
                f" | docstring={method.has_docstring}"
            )