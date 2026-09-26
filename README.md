# AI Code Documentation Tool



An AI-powered tool that analyzes source code, detects documentation issues, scans for security-sensitive information, and generates documentation using an AI provider.



## Core AI Pipeline



The `core_ai` package provides the main code-analysis and documentation-generation pipeline.



The pipeline consists of the following stages:



### M1 â€” Repository Scanning



Scans the target repository and collects supported source files for analysis.



### M2 â€” AST Analysis



Analyzes source code using the Abstract Syntax Tree (AST) to understand functions, classes, parameters, return values, and existing documentation.



### M3 â€” Documentation Checking



Checks the analyzed code for missing or incomplete documentation, including undocumented functions and classes.



### M4 â€” Stale Documentation Detection



Detects documentation that may no longer match the current source-code structure.



### M5 â€” Security Scanning and Redaction



Scans repository files for sensitive information such as:



- API keys

- Access tokens

- Passwords

- Secrets

- Personally identifiable information (PII)



Detected sensitive information is redacted before repository content is sent to an AI provider.



### M6 â€” AI Documentation Generation



Builds a sanitized AI input from the repository analysis and sends it to the configured AI provider.



The AI provider can generate documentation such as:



- Function docstrings

- Class documentation

- README content

- Other documentation changes supported by the pipeline



## Installation



From the project root, install the project in editable mode:



```bash

pip install -e .

```



## Environment Configuration



Create a `.env` file in the \*\*project root\*\*, next to `.env.example`.



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



- `gemini`

- `openrouter`



Keep API keys and other credentials only in `.env`.



\*\*Never commit `.env` or real API keys to Git.\*\*



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



Run the complete test suite from the project root:



```bash

pytest tests/

```



## Project Structure



```text

AI-Code-Documentation-Tool/

â”œâ”€â”€ backend/

â”œâ”€â”€ core_ai/

â”‚   â”œâ”€â”€ ai/

â”‚   â”œâ”€â”€ models/

â”‚   â”œâ”€â”€ demo_project/

â”‚   â”œâ”€â”€ ast_analyzer.py

â”‚   â”œâ”€â”€ config.py

â”‚   â”œâ”€â”€ documentation_checker.py

â”‚   â”œâ”€â”€ pipeline.py

â”‚   â”œâ”€â”€ redactor.py

â”‚   â”œâ”€â”€ run_demo.py

â”‚   â”œâ”€â”€ scanner.py

â”‚   â”œâ”€â”€ security_scanner.py

â”‚   â””â”€â”€ stale_documentation.py

â”œâ”€â”€ frontend/

â”œâ”€â”€ tests/

â”œâ”€â”€ .env.example

â”œâ”€â”€ .gitignore

â”œâ”€â”€ LICENSE

â”œâ”€â”€ pyproject.toml

â””â”€â”€ README.md

```



## Security



The Core AI pipeline is designed to redact detected secrets and PII before repository content is provided to an AI provider.



For local development:



- Store credentials in `.env`.

- Keep `.env` out of Git.

- Use `.env.example` as the safe configuration template.

- Never share a project archive containing live credentials.



## Development



Install the project:



```bash

pip install -e .

```



Run the tests:



```bash

pytest tests/

```



Run the demo:



```bash

core-ai-demo core_ai/demo_project

```


