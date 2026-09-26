from typing import Literal

from pydantic import BaseModel


class BeforeAfterChange(BaseModel):
    file: str
    target: str
    type: Literal["docstring", "comment"]
    before: str
    after: str
