"""Models used by the Core AI batching system."""

from pydantic import BaseModel, Field

from ..models.security import SanitizedFile


class FileBatch(BaseModel):
    """Represent one size-limited batch of sanitized repository files."""

    batch_id: int
    files: list[SanitizedFile] = Field(default_factory=list)
    total_bytes: int

    @property
    def file_count(self) -> int:
        """Return the number of files contained in the batch."""
        return len(self.files)
