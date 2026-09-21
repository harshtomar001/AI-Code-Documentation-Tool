from ai.openrouter_provider import OpenRouterProvider


provider = OpenRouterProvider()

response = provider.generate(
    "Reply with exactly: OPENROUTER_OK"
)

print("\n--- OPENROUTER RESPONSE ---")
print(response)