import os

from dotenv import load_dotenv
from openai import OpenAI

from .provider import AIProvider


load_dotenv()


class OpenRouterProvider(AIProvider):

    def __init__(self):
        api_key = os.getenv("OPENROUTER_API_KEY")

        if not api_key:
            raise ValueError(
                "OPENROUTER_API_KEY environment variable is not set"
            )

        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )

    def generate(self, prompt: str) -> str:

        response = self.client.chat.completions.create(
            model="openrouter/free",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return response.choices[0].message.content