from models.scanner import SourceFile

from security_scanner import SecurityScanner
from redactor import Redactor


source = SourceFile(
    path="config.py",
    language="python",
    content='''
API_KEY = "sk-test-123456789"
PASSWORD = "super_secret_password"
ACCESS_TOKEN = "abc123token"

EMAIL = "harsh@example.com"
PHONE = "9876543210"

normal_value = "hello world"
'''
)


# M5: Detect sensitive information
scanner = SecurityScanner()

matches = scanner.scan(
    [source]
)


# M6: Redact sensitive information
redactor = Redactor()

sanitized_files = redactor.redact(
    [source],
    matches
)


print("\n--- ORIGINAL ---")

print(source.content)


print("\n--- SANITIZED ---")

for file in sanitized_files:
    print(file.content)


print("\n--- SECURITY CHECK ---")

sanitized_content = sanitized_files[0].content

sensitive_values = [
    "sk-test-123456789",
    "super_secret_password",
    "abc123token",
    "harsh@example.com",
    "9876543210",
]


for value in sensitive_values:

    if value in sanitized_content:
        print(
            f"FAIL: sensitive value still present: {value}"
        )
    else:
        print(
            f"PASS: removed -> {value}"
        )