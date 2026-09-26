# Contributing to AI Code Documentation Tool

Thank you for contributing to the AI Code Documentation Tool.

This document describes the development workflow, code-quality requirements, and pull-request process for the project.

## Development Setup

### Requirements

* Python 3.11 or newer
* Git
* pip

### Clone the repository

```bash
git clone https://github.com/harshtomar001/AI-Code-Documentation-Tool.git
cd AI-Code-Documentation-Tool
```

### Create a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Install the project

```bash
python -m pip install -e .
```

### Install development tools

```bash
python -m pip install pytest pytest-cov ruff mypy
```

## Project Structure

```text
AI-Code-Documentation-Tool/
├── backend/
├── core_ai/
│   ├── ai/
│   ├── models/
│   ├── demo_project/
│   ├── ast_analyzer.py
│   ├── config.py
│   ├── documentation_checker.py
│   ├── pipeline.py
│   ├── redactor.py
│   ├── scanner.py
│   ├── security_scanner.py
│   └── stale_documentation.py
├── frontend/
├── tests/
├── .github/
│   └── workflows/
├── .env.example
├── pyproject.toml
└── README.md
```

The `core_ai` package contains the main code-analysis and documentation-generation pipeline.

## Branching Workflow

Do not work directly on `main`.

Create a dedicated branch for each feature, fix, or improvement:

```bash
git checkout main
git pull origin main
git checkout -b feature/<short-description>
```

Examples:

```text
feature/multilanguage-scanner
feature/security-hardening
fix/stale-doc-detection
test/pipeline-coverage
docs/readme-update
```

Keep commits focused on one logical change.

## Making Changes

Before committing:

1. Make the smallest change required for the task.
2. Add or update tests when behavior changes.
3. Run the project's quality checks locally.
4. Review the staged diff.
5. Commit only the intended files.

For Core AI changes, run:

```bash
python -m pytest -q --cov=core_ai --cov-report=term-missing --cov-fail-under=90
ruff check core_ai tests
ruff format --check core_ai tests
mypy core_ai
```

All checks should pass before opening a pull request.

## Commit Messages

Use short, descriptive commit messages.

Preferred format:

```text
<type>: <description>
```

Common types:

```text
feat: add Java scanner support
fix: handle empty source files
test: expand security scanner coverage
docs: update Core AI pipeline
refactor: simplify provider selection
ci: update GitHub Actions checks
```

## Pull Requests

Push your branch:

```bash
git push -u origin <branch-name>
```

Then open a pull request against `main`.

A pull request should include:

* A clear description of the change
* The reason for the change
* Tests added or updated, when applicable
* Any known limitations
* Relevant screenshots or examples for UI changes

Keep pull requests focused and reasonably small.

## Pull Request Checklist

* [ ] The code builds or imports successfully.
* [ ] Relevant tests pass.
* [ ] Test coverage remains at or above 90% for `core_ai`.
* [ ] Ruff lint checks pass.
* [ ] Ruff formatting checks pass.
* [ ] mypy passes for `core_ai`.
* [ ] No secrets or credentials are committed.
* [ ] No unnecessary generated files are included.
* [ ] Documentation has been updated when behavior or public usage changes.
* [ ] The pull request description explains the change.

## Security

Never commit:

* API keys
* Passwords
* Access tokens
* Private keys
* `.env` files
* Production credentials

Use `.env.example` to document required environment variables without including real values.

If sensitive information is accidentally committed, rotate the affected credential immediately and report the incident according to `SECURITY.md`.

## Code Quality

Core AI code should follow the project's configured Ruff and mypy rules.

Prefer:

* Clear type annotations
* Small, focused functions
* Explicit error handling
* Descriptive names
* Tests for new behavior
* Minimal unrelated changes

Avoid:

* Large unrelated refactors
* Dead code
* Hard-coded credentials
* Disabling quality checks without a documented reason

## Continuous Integration

GitHub Actions automatically runs Core AI quality checks on pushes and pull requests.

The CI workflow currently checks:

* Python 3.11
* Python 3.12
* Python 3.13
* Pytest
* Test coverage with a 90% minimum
* Ruff linting
* Ruff formatting
* mypy

A pull request should not be considered ready until the required CI checks pass.

## Review Guidelines

Reviewers should focus on:

1. Correctness
2. Security
3. Test coverage
4. Maintainability
5. Compatibility with the existing architecture
6. Clear documentation

Feedback should be specific and focused on improving the implementation.

## Questions and Discussions

For substantial architectural changes, discuss the proposed approach with the relevant project contributors before implementing a large change.

When reporting a bug, include:

* What happened
* What was expected
* Steps to reproduce
* Relevant logs or error messages
* Environment information when useful

Thank you for helping improve the project.
