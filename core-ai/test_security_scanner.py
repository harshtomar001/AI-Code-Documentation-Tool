from models.scanner import SourceFile
from security_scanner import SecurityScanner


source = SourceFile(
    path="config.py",
    language="python",
    content='''
API_KEY = "sk-test-123456789"
PASSWORD = "super_secret_password"
ACCESS_TOKEN = "abc123token"
SECRET = "my-secret-value"

EMAIL = "harsh@example.com"
PHONE = "9876543210"

normal_value = "hello world"
'''
)


scanner = SecurityScanner()

matches = scanner.scan([source])


print("\n--- SECURITY FINDINGS ---")

for match in matches:

    print(
        f"{match.file}"
        f" | type={match.type}"
        f" | category={match.category}"
        f" | line={match.line}"
        f" | start={match.start}"
        f" | end={match.end}"
        f" | replacement={match.replacement}"
    )


print("\n--- TOTAL FINDINGS ---")
print(len(matches))