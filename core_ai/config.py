from pathlib import Path

from dotenv import load_dotenv


def load_environment() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(env_path)
