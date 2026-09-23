from scanner import FileScanner


scanner = FileScanner()

files = scanner.scan(".")

print("\n--- SCANNED FILES ---")

for file in files:
    print(
        f"{file.path} "
        f"[{file.language}]"
    )

print("\n--- TOTAL ---")
print(len(files))