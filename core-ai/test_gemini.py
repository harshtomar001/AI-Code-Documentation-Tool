from ai.gemini_provider import GeminiProvider


provider = GeminiProvider()

response = provider.generate(
    "Tell me about your capabilities"
)

print("\n--- GEMINI RESPONSE ---")
print(response)