from ai.structured_output import StructuredOutputParser


parser = StructuredOutputParser()


# ---------------------------------
# TEST 1: Valid JSON
# ---------------------------------

valid_response = """
{
    "files": [
        {
            "path": "app.py",
            "changes": [
                {
                    "type": "docstring",
                    "target": "calculate_discount",
                    "content": "Calculate the discounted price."
                }
            ]
        }
    ],
    "readme": "A simple discount calculator."
}
"""

result = parser.parse(valid_response)

print("\nTEST 1: Valid JSON")
print("PASS")
print(result)


# ---------------------------------
# TEST 2: Markdown code fence
# ---------------------------------

fenced_response = """```json
{
    "files": [],
    "readme": "Test project"
}
```"""

result = parser.parse(fenced_response)

print("\nTEST 2: Markdown fenced JSON")
print("PASS")
print(result)


# ---------------------------------
# TEST 3: Invalid JSON
# ---------------------------------

invalid_response = """
{
    "files": [
        {
            "path": "app.py"
"""

try:
    parser.parse(invalid_response)
    print("\nTEST 3: Invalid JSON")
    print("FAIL")

except ValueError as e:
    print("\nTEST 3: Invalid JSON")
    print("PASS")
    print(e)


# ---------------------------------
# TEST 4: Invalid schema
# ---------------------------------

invalid_schema = """
{
    "files": [
        {
            "path": "app.py",
            "changes": [
                {
                    "type": "something_invalid",
                    "target": "calculate_discount",
                    "content": "test"
                }
            ]
        }
    ],
    "readme": null
}
"""

try:
    parser.parse(invalid_schema)
    print("\nTEST 4: Invalid schema")
    print("FAIL")

except ValueError as e:
    print("\nTEST 4: Invalid schema")
    print("PASS")
    print(e)