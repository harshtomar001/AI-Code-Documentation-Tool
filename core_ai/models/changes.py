from pydantic import BaseModel
from typing import Literal


class BeforeAfterChange(BaseModel):
    file: str
    target: str
    type: Literal["docstring", "comment"]
    before: str
    after: str