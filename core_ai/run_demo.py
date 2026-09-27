import sys
from pathlib import Path
from .config import load_environment
from dotenv import load_dotenv

from .pipeline import CorePipeline
from .ai.service import AIService
from .ai.context_builder import ContextBuilder
from .ai.prompt_builder import DocumentationPromptBuilder
from .ai.structured_output import StructuredOutputParser
from .ai.change_generator import ChangeGenerator
from .ai.provider_factory import ProviderFactory


def main():


    load_environment()

    # --------------------------------------------------
    # Check command-line argument
    # --------------------------------------------------

    if len(sys.argv) != 2:
        print("Usage:")
        print("  python run_demo.py <repository_path>")
        print()
        print("Example:")
        print("  python run_demo.py demo_project")
        return

    repository_path = Path(sys.argv[1])

    if not repository_path.exists():
        print(f"Error: path does not exist: {repository_path}")
        return

    # --------------------------------------------------
    # Create AI components
    # --------------------------------------------------


    provider = ProviderFactory.create()

    context_builder = ContextBuilder()

    prompt_builder = DocumentationPromptBuilder()

    output_parser = StructuredOutputParser()

    change_generator = ChangeGenerator()

    ai_service = AIService(
        provider=provider,
        context_builder=context_builder,
        prompt_builder=prompt_builder,
        output_parser=output_parser,
        change_generator=change_generator,
    )

    # --------------------------------------------------
    # Create Core Pipeline
    # --------------------------------------------------

    pipeline = CorePipeline(
        ai_service=ai_service
    )

    # --------------------------------------------------
    # Run complete pipeline
    # --------------------------------------------------

    print("=" * 70)
    print("AI CODE DOCUMENTATION TOOL")
    print("END-TO-END DEMO")
    print("=" * 70)

    print(f"\nRepository: {repository_path}")

    result = pipeline.run(
        repository_path=str(repository_path),
        repository_name=repository_path.name,
    )

    # ==================================================
    # M1 - FILE SCANNING
    # ==================================================

    print("\n" + "=" * 70)
    print("M1 - FILE SCANNING")
    print("=" * 70)

    print(f"Files found: {len(result.files)}")

    for file in result.files:
        print(f"  - {file.path} [{file.language}]")

    # ==================================================
    # M2 - AST ANALYSIS
    # ==================================================

    print("\n" + "=" * 70)
    print("M2 - AST ANALYSIS")
    print("=" * 70)

    print(f"Functions/classes analyzed: {len(result.analysis.files)}")

    # ==================================================
    # M3 - DOCUMENTATION CHECK
    # ==================================================

    print("\n" + "=" * 70)
    print("M3 - DOCUMENTATION CHECK")
    print("=" * 70)

    if result.documentation_check.issues:

        print(
            f"Undocumented items: "
            f"{len(result.documentation_check.issues)}"
        )

        for issue in result.documentation_check.issues:

            print(
                f"  - {issue.file}:{issue.line} "
                f"{issue.target} "
                f"({issue.type})"
            )

    else:
        print("No undocumented public items found.")

    # ==================================================
    # M4 - STALE DOCUMENTATION
    # ==================================================

    print("\n" + "=" * 70)
    print("M4 - STALE DOCUMENTATION")
    print("=" * 70)

    if result.stale_documentation.issues:

        print(
            f"Stale documentation issues: "
            f"{len(result.stale_documentation.issues)}"
        )

        for issue in result.stale_documentation.issues:

            print(
                f"  - {issue.file}:{issue.line} "
                f"{issue.target}"
            )

            print(
                f"    {issue.details}"
            )

    else:
        print("No stale documentation found.")

    # ==================================================
    # M5 - SECURITY SCANNING
    # ==================================================

    print("\n" + "=" * 70)
    print("M5 - SECURITY SCAN")
    print("=" * 70)

    if result.security.findings:

        print(
            f"Security findings: "
            f"{len(result.security.findings)}"
        )

        for finding in result.security.findings:

            print(
                f"  - [{finding.type}] "
                f"{finding.category} "
                f"-> {finding.file}:{finding.line}"
            )

    else:
        print("No secrets or PII detected.")

    # ==================================================
    # M6 - REDACTION
    # ==================================================

    print("\n" + "=" * 70)
    print("M6 - REDACTION / AI-SAFE CODE")
    print("=" * 70)

    for file in result.sanitized_files:

        print(f"\n--- {file.path} ---")
        print(file.content)

    # ==================================================
    # AI RESULT
    # ==================================================

    print("\n" + "=" * 70)
    print("AI DOCUMENTATION GENERATION")
    print("=" * 70)

    if result.ai_result is None:

        print("AI generation did not run.")
        return

    documentation = result.ai_result.documentation

    # --------------------------------------------------
    # Generated documentation
    # --------------------------------------------------

    for file in documentation.files:

        print(f"\nFILE: {file.path}")

        for change in file.changes:

            print(f"\nTarget: {change.target}")
            print(f"Type:   {change.type}")

            print("\nGenerated content:")
            print(change.content)

    # ==================================================
    # GENERATED README
    # ==================================================

    if documentation.readme:

        print("\n" + "=" * 70)
        print("GENERATED README")
        print("=" * 70)

        print(documentation.readme)

    # ==================================================
    # BEFORE -> AFTER
    # ==================================================

    print("\n" + "=" * 70)
    print("BEFORE -> AFTER CHANGES")
    print("=" * 70)

    changes = result.ai_result.changes

    if not changes:

        print("No changes generated.")

    else:

        for index, change in enumerate(changes, start=1):

            print(f"\nCHANGE {index}")
            print("-" * 70)

            print(f"File:   {change.file}")
            print(f"Target: {change.target}")
            print(f"Type:   {change.type}")

            print("\n--- BEFORE ---")
            print(change.before)

            print("\n--- AFTER ---")
            print(change.after)

    # ==================================================
    # COMPLETE
    # ==================================================

    print("\n" + "=" * 70)
    print("END-TO-END DEMO COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()
