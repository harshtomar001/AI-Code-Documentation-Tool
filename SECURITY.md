# Security Policy

## Supported Versions

Security fixes are applied to the actively developed version of the project.

Older versions may not receive security updates.

## Reporting a Security Issue

If you discover a security vulnerability in the AI Code Documentation Tool, please report it privately rather than opening a public GitHub issue.

When reporting a vulnerability, include:

* A clear description of the issue
* Steps to reproduce it
* The affected component or file
* The potential security impact
* Relevant logs, screenshots, or proof-of-concept details when safe to provide
* Any suggested mitigation, if known

Do not include real API keys, passwords, access tokens, private keys, or other sensitive credentials in the report.

## Secrets and Credentials

Never commit the following to the repository:

* API keys
* Passwords
* Access tokens
* Private keys
* Production credentials
* `.env` files containing real secrets

Use `.env.example` to document required environment variables without storing their values.

If a credential is accidentally committed:

1. Revoke or rotate the exposed credential immediately.
2. Remove the secret from the repository.
3. Check whether the credential was used or accessed.
4. Report the incident privately to the project maintainers.

Removing a secret from the latest commit does not necessarily remove it from Git history, so exposed credentials should be treated as compromised.

## Core AI Security

The Core AI pipeline includes security scanning and redaction before source code is sent to an AI provider.

The security layer is designed to detect sensitive information such as:

* API keys and provider-specific tokens
* Passwords and access tokens
* Private keys
* Personally identifiable information
* High-entropy secret-like strings

Sensitive matches are redacted before sanitized source content is passed to the AI generation layer.

## Environment Configuration

Environment variables should be used for provider credentials and other sensitive configuration.

Do not place credentials directly in:

* Python source files
* Test fixtures
* Documentation
* Configuration committed to Git
* Example projects

Use placeholder values in examples and tests.

## Dependencies

Keep project dependencies reasonably up to date and review security-related dependency updates before merging them.

Security-sensitive dependency changes should be tested through the project's normal CI checks.

## Responsible Disclosure

Please allow the maintainers reasonable time to investigate and address a privately reported vulnerability before publicly disclosing technical details.

Security reports should not be used to expose credentials, personal information, or other sensitive data.
