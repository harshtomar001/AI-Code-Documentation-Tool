"""AST-aware batching for sanitized repository files."""

from ..models.analysis import AnalysisResult, FileAnalysis
from ..models.security import SanitizedFile
from .models import FileBatch


class Batcher:
    """Divide sanitized repository files into deterministic AI batches."""

    def __init__(
        self,
        max_batch_bytes: int,
        large_file_target_bytes: int | None = None,
    ) -> None:
        """Initialize the batcher.

        Args:
            max_batch_bytes: Maximum preferred size of a normal batch.
            large_file_target_bytes: Preferred chunk size for oversized files.
                If omitted, 75% of max_batch_bytes is used.
        """
        if max_batch_bytes <= 0:
            raise ValueError("max_batch_bytes must be greater than zero")

        self.max_batch_bytes = max_batch_bytes

        if large_file_target_bytes is None:
            large_file_target_bytes = int(max_batch_bytes * 0.75)

        if large_file_target_bytes <= 0:
            raise ValueError("large_file_target_bytes must be greater than zero")

        self.large_file_target_bytes = large_file_target_bytes

    def create_batches(
        self,
        files: list[SanitizedFile],
        analysis: AnalysisResult | None = None,
    ) -> list[FileBatch]:
        """Create deterministic batches.

        Normal files are grouped using the configured batch limit.

        Oversized Python files are split into AST-aligned logical chunks.
        Individual functions and methods are never split.
        """
        if not files:
            return []

        batches: list[FileBatch] = []
        current_files: list[SanitizedFile] = []
        current_size = 0

        analysis_by_path = {
            file.path: file
            for file in (analysis.files if analysis is not None else [])
        }

        for file in files:
            file_size = self._file_size(file)
            analysis_file = analysis_by_path.get(file.path)

            if (
                file_size > self.max_batch_bytes
                and analysis_file is not None
                and analysis_file.language == "python"
            ):
                if current_files:
                    batches.append(
                        self._create_batch(
                            batch_id=len(batches) + 1,
                            files=current_files,
                            total_bytes=current_size,
                        )
                    )
                    current_files = []
                    current_size = 0

                chunks = self._split_large_python_file(
                    file,
                    analysis_file,
                )

                for chunk in chunks:
                    batches.append(
                        self._create_batch(
                            batch_id=len(batches) + 1,
                            files=[chunk],
                            total_bytes=self._file_size(chunk),
                        )
                    )

                continue

            would_exceed_limit = (
                bool(current_files)
                and current_size + file_size > self.max_batch_bytes
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

    def _split_large_python_file(
        self,
        file: SanitizedFile,
        analysis: FileAnalysis,
    ) -> list[SanitizedFile]:
        """Split an oversized Python file into AST-aligned chunks."""
        lines = file.content.splitlines(keepends=True)

        if not lines:
            return [file]

        units = self._build_units(analysis)

        if not units:
            return [file]

        chunks: list[SanitizedFile] = []

        current_content_start = units[0][0]
        current_content_end = units[0][1]
        current_target_start = units[0][2]
        current_target_end = units[0][3]

        for (
            content_start,
            content_end,
            target_start,
            target_end,
        ) in units[1:]:
            candidate_size = self._range_size(
                lines,
                current_content_start,
                content_end,
            )

            if (
                candidate_size > self.large_file_target_bytes
                and current_content_start <= current_content_end
            ):
                chunks.append(
                    self._make_chunk(
                        file=file,
                        lines=lines,
                        start_line=current_content_start,
                        end_line=current_content_end,
                        target_start_line=current_target_start,
                        target_end_line=current_target_end,
                    )
                )

                # The next method gets the class declaration as context,
                # but does not repeat the source of previous methods.
                current_content_start = content_start
                current_content_end = content_end
                current_target_start = target_start
                current_target_end = target_end
            else:
                current_content_end = content_end
                current_target_end = target_end

        if current_content_start <= current_content_end:
            chunks.append(
                self._make_chunk(
                    file=file,
                    lines=lines,
                    start_line=current_content_start,
                    end_line=current_content_end,
                    target_start_line=current_target_start,
                    target_end_line=current_target_end,
                )
            )

        return chunks

    @classmethod
    def _build_units(
        cls,
        analysis: FileAnalysis,
    ) -> list[tuple[int, int, int, int]]:
        """Build ordered AST-aligned source units.

        Each tuple contains:

            content_start
            content_end
            target_start
            target_end

        Top-level functions use their own range for both.

        A class method uses the class declaration as source context and
        the method itself as the documentation target.

        A class without methods uses the complete class range.
        """
        units: list[tuple[int, int, int, int]] = []

        for function in analysis.functions:
            if function.line_end >= function.line_start:
                units.append(
                    (
                        function.line_start,
                        function.line_end,
                        function.line_start,
                        function.line_end,
                    )
                )

        for cls in analysis.classes:
            if not cls.methods:
                if cls.line_end >= cls.line_start:
                    units.append(
                        (
                            cls.line_start,
                            cls.line_end,
                            cls.line_start,
                            cls.line_end,
                        )
                    )
                continue

            for method in cls.methods:
                if method.line_end >= method.line_start:
                    units.append(
                        (
                            cls.line_start,
                            method.line_end,
                            method.line_start,
                            method.line_end,
                        )
                    )

        units.sort(key=lambda unit: (unit[0], unit[1], unit[2], unit[3]))

        return units

    @staticmethod
    def _range_size(
        lines: list[str],
        start_line: int,
        end_line: int,
    ) -> int:
        """Return UTF-8 byte size for an inclusive source range."""
        start_index = max(start_line - 1, 0)
        end_index = min(end_line, len(lines))

        return len(
            "".join(lines[start_index:end_index]).encode("utf-8")
        )

    @staticmethod
    def _make_chunk(
        file: SanitizedFile,
        lines: list[str],
        start_line: int,
        end_line: int,
        target_start_line: int,
        target_end_line: int,
    ) -> SanitizedFile:
        """Create a source chunk with explicit AST target coordinates."""
        start_index = max(start_line - 1, 0)
        end_index = min(end_line, len(lines))

        content = "".join(lines[start_index:end_index])

        return SanitizedFile(
            path=file.path,
            content=content,
            start_line=start_line,
            end_line=end_line,
            target_start_line=target_start_line,
            target_end_line=target_end_line,
        )

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
        """Create a FileBatch from supplied files."""
        return FileBatch(
            batch_id=batch_id,
            files=files,
            total_bytes=total_bytes,
        )
