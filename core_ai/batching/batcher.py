"""Size-based batching for sanitized repository files."""

from ..models.security import SanitizedFile
from .models import FileBatch


class Batcher:
    """Divide sanitized files into deterministic size-based batches."""

    def __init__(self, max_batch_bytes: int) -> None:
        """Initialize the batcher.

        Args:
            max_batch_bytes: Maximum preferred size of a batch in bytes.

        Raises:
            ValueError: If the configured batch size is not positive.
        """
        if max_batch_bytes <= 0:
            raise ValueError("max_batch_bytes must be greater than zero")

        self.max_batch_bytes = max_batch_bytes

    def create_batches(
        self,
        files: list[SanitizedFile],
    ) -> list[FileBatch]:
        """Create size-based batches without splitting individual files.

        Files are processed in their existing order. A new batch is created
        when adding the next file would exceed the configured batch size.

        A single file larger than the configured limit is kept intact in its
        own batch.
        """
        if not files:
            return []

        batches: list[FileBatch] = []
        current_files: list[SanitizedFile] = []
        current_size = 0

        for file in files:
            file_size = self._file_size(file)

            would_exceed_limit = (
                current_files and current_size + file_size > self.max_batch_bytes
            )

            if would_exceed_limit:
                batches.append(
                    self._create_batch(
                        batch_id=len(batches) + 1,
                        files=current_files,
                        total_bytes=current_size,
                    )
                )
                current_files = []
                current_size = 0

            current_files.append(file)
            current_size += file_size

        if current_files:
            batches.append(
                self._create_batch(
                    batch_id=len(batches) + 1,
                    files=current_files,
                    total_bytes=current_size,
                )
            )

        return batches

    @staticmethod
    def _file_size(file: SanitizedFile) -> int:
        """Return the UTF-8 encoded size of a sanitized file."""
        return len(file.content.encode("utf-8"))

    @staticmethod
    def _create_batch(
        batch_id: int,
        files: list[SanitizedFile],
        total_bytes: int,
    ) -> FileBatch:
        """Create a FileBatch from the supplied files."""
        return FileBatch(
            batch_id=batch_id,
            files=files,
            total_bytes=total_bytes,
        )
