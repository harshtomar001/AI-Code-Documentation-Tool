\# Core AI



`core\_ai` is the AI-powered code documentation analysis and generation pipeline of the AI Code Documentation Tool.



It analyzes a repository, identifies documentation problems, checks for stale documentation, scans for security-sensitive information, safely redacts detected secrets/PII, and then uses an AI provider to generate documentation.



\## M1-M6 Pipeline



The Core AI pipeline performs the following stages:



\### M1 — Repository Scanning



Scans the target repository and collects supported source files for analysis.



\### M2 — AST Analysis



Parses source code using the Abstract Syntax Tree (AST) to understand functions, classes, parameters, return values, and existing documentation.



\### M3 — Documentation Checking



Checks the analyzed code for missing or incomplete documentation, such as undocumented functions and classes.



\### M4 — Stale Documentation Detection



Identifies documentation that may no longer match the current source-code structure.



\### M5 — Security Scanning and Redaction



Scans repository files for sensitive information such as:



\- API keys

\- Access tokens

\- Passwords

\- Secrets

\- Personally identifiable information (PII)



Detected sensitive information is redacted before repository content is sent to an AI provider.



\### M6 — AI Documentation Generation



Builds a sanitized AI input from the repository analysis and sends it to the configured AI provider.



The AI provider can generate documentation such as:



\- Function docstrings

\- Class documentation

\- README content

\- Other documentation changes supported by the pipeline



\## Installation



From the project root:



```bash

pip install -e .

