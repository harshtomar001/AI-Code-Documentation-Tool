# AI Code Documentation Tool

An AI-powered tool that analyzes source code, detects documentation issues, scans for security-sensitive information, and generates documentation using an AI provider.

## Core AI Pipeline

The `core_ai` package provides the main code-analysis and documentation-generation pipeline.

The pipeline consists of the following stages:

### M1 — Repository Scanning

Scans the target repository and collects supported source files for analysis.

### M2 — AST Analysis

Analyzes source code using the Abstract Syntax Tree (AST) to understand functions, classes, parameters, return values, and existing documentation.

### M3 — Documentation Checking

Checks the analyzed code for missing or incomplete documentation, including undocumented functions and classes.

### M4 — Stale Documentation Detection

Detects documentation that may no longer match the current source-code structure.

### M5 — Security Scanning and Redaction

Scans repository files for sensitive information such as:

* API keys
* Access tokens
* Passwords
* Secrets
* Personally identifiable information (PII)
* Provider-specific credentials
* High-entropy secret-like strings

Detected sensitive information is redacted before repository content is sent to an AI provider.

### M6 — AI Documentation Generation

Builds a sanitized AI input from the repository analysis and sends it to the configured AI provider.

The AI provider can generate documentation such as:

* Function docstrings
* Class documentation
* README content
* Other documentation changes supported by the pipeline

## Installation

From the project root, install the project in editable mode:

```bash
python -m pip install -e .
```

For development, install the project quality and testing tools:

```bash
python -m pip install pytest pytest-cov ruff mypy
```

## Environment Configuration

Create a `.env` file in the **project root**, next to `.env.example`.

Example:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
OPENROUTER_API_KEY=
```

See `.env.example` for the available environment variables.

### AI_PROVIDER

Selects the AI provider used by the pipeline.

Supported providers currently include:

* `gemini`
* `openrouter`

Keep API keys and other credentials only in `.env`.

**Never commit `.env` or real API keys to Git.**

## Running the Demo

From the project root:

```bash
python -m core_ai.run_demo core_ai/demo_project
```

Alternatively, use the installed console script:

```bash
core-ai-demo core_ai/demo_project
```

The demo scans the example project, analyzes its code, checks documentation, detects stale documentation, scans for security-sensitive information, redacts detected sensitive data, and generates documentation through the configured AI provider.

## Running Tests

Run the complete test suite:

```bash
python -m pytest -q
```

Run the test suite with coverage enforcement:

```bash
python -m pytest -q --cov=core_ai --cov-report=term-missing --cov-fail-under=90
```

## Code Quality

The Core AI project uses Ruff for linting and formatting and mypy for static type checking.

Run linting:

```bash
ruff check core_ai tests
```

Check formatting:

```bash
ruff format --check core_ai tests
```

Run type checking:

```bash
mypy core_ai
```

All of these checks are also executed by GitHub Actions CI.

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
│   ├── run_demo.py
│   ├── scanner.py
│   ├── security_scanner.py
│   └── stale_documentation.py
├── frontend/
├── tests/
├── .github/
│   └── workflows/
├── .env.example
├── .gitignore
├── LICENSE
├── pyproject.toml
└── README.md
```

The `core_ai` package contains the main code-analysis, security, documentation-checking, and AI-generation pipeline.

## Security

The Core AI pipeline is designed to detect and redact sensitive information before repository content is provided to an AI provider.

For local development:

* Store credentials in `.env`.
* Keep `.env` out of Git.
* Use `.env.example` as the safe configuration template.
* Never share a project archive containing live credentials.
* Never commit API keys, access tokens, passwords, or private keys.

For security vulnerabilities, follow the reporting process described in [`SECURITY.md`](SECURITY.md).

## Development Workflow

Contributors should work on dedicated branches rather than directly on `main`.

Before opening a pull request, run:

```bash
python -m pytest -q --cov=core_ai --cov-report=term-missing --cov-fail-under=90
ruff check core_ai tests
ruff format --check core_ai tests
mypy core_ai
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow and pull-request guidelines.

## Project Status

The Core AI pipeline is under active development.

Current work focuses on:

* Expanding language support.
* Improving code analysis.
* Improving documentation detection and generation.
* Strengthening security scanning and redaction.
* Increasing automated test coverage.
* Improving AI provider reliability.
* Maintaining automated CI quality checks.

The backend and frontend components are maintained separately from the Core AI implementation and may evolve independently.



