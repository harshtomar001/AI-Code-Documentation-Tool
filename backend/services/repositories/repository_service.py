"""Secure repository archive handling."""

from pathlib import Path
from zipfile import ZipFile

MAX_ARCHIVE_BYTES = 50 * 1024 * 1024
MAX_EXTRACTED_BYTES = 200 * 1024 * 1024
MAX_FILE_COUNT = 10_000


class RepositoryUploadError(ValueError):
    """Raised when a repository archive is invalid or unsafe."""


class RepositoryService:
    """Validate and safely extract repository ZIP archives."""

    def extract_zip(
        self,
        archive_path: Path,
        destination: Path,
    ) -> Path:
        """Extract a repository ZIP into a controlled directory.

        Args:
            archive_path: Path to the uploaded ZIP archive.
            destination: Directory where the repository is extracted.

        Returns:
            The extraction directory.

        Raises:
            RepositoryUploadError: If the archive is invalid or unsafe.
        """
        if not archive_path.is_file():
            raise RepositoryUploadError("Repository archive does not exist")

        archive_size = archive_path.stat().st_size

        if archive_size > MAX_ARCHIVE_BYTES:
            raise RepositoryUploadError(
                "Repository archive exceeds the maximum allowed size"
            )

        destination = destination.resolve()
        destination.mkdir(parents=True, exist_ok=True)

        try:
            with ZipFile(archive_path) as archive:
                members = archive.infolist()

                if len(members) > MAX_FILE_COUNT:
                    raise RepositoryUploadError(
                        "Repository archive contains too many files"
                    )

                total_size = 0

                for member in members:
                    member_path = Path(member.filename)

                    if member_path.is_absolute():
                        raise RepositoryUploadError(
                            "Repository archive contains an absolute path"
                        )

                    target = (destination / member_path).resolve()

                    if not self._is_inside(destination, target):
                        raise RepositoryUploadError(
                            "Repository archive contains an unsafe path"
                        )

                    total_size += member.file_size

                    if total_size > MAX_EXTRACTED_BYTES:
                        raise RepositoryUploadError(
                            "Repository archive expands beyond the maximum allowed size"
                        )

                archive.extractall(destination)

        except RepositoryUploadError:
            raise
        except Exception as exc:
            raise RepositoryUploadError("Unable to read repository archive") from exc

        return destination

    @staticmethod
    def _is_inside(root: Path, candidate: Path) -> bool:
        """Return whether candidate is contained inside root."""
        try:
            candidate.relative_to(root)
            return True
        except ValueError:
            return False
