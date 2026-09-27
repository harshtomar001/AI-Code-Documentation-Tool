"""Tests for size-based repository batching."""

import pytest

from core_ai.batching import Batcher
from core_ai.models.security import SanitizedFile


def make_file(path: str, size: int) -> SanitizedFile:
    """Create a sanitized file with approximately the requested byte size."""
    return SanitizedFile(
        path=path,
        content="x" * size,
    )


def test_empty_input_returns_no_batches() -> None:
    """An empty file list should produce no batches."""
    batcher = Batcher(max_batch_bytes=100)

    result = batcher.create_batches([])

    assert result == []


def test_files_are_grouped_by_size() -> None:
    """Files should be grouped until adding another exceeds the limit."""
    files = [
        make_file("a.py", 40),
        make_file("b.py", 30),
        make_file("c.py", 50),
        make_file("d.py", 20),
    ]

    batcher = Batcher(max_batch_bytes=100)

    batches = batcher.create_batches(files)

    assert len(batches) == 2

    assert [file.path for file in batches[0].files] == [
        "a.py",
        "b.py",
    ]
    assert batches[0].total_bytes == 70

    assert [file.path for file in batches[1].files] == [
        "c.py",
        "d.py",
    ]
    assert batches[1].total_bytes == 70


def test_exact_boundary_is_allowed() -> None:
    """A file that exactly reaches the batch limit stays in the batch."""
    files = [
        make_file("a.py", 60),
        make_file("b.py", 40),
    ]

    batcher = Batcher(max_batch_bytes=100)

    batches = batcher.create_batches(files)

    assert len(batches) == 1
    assert batches[0].total_bytes == 100
    assert batches[0].file_count == 2


def test_oversized_file_is_not_split() -> None:
    """A file larger than the limit should remain intact."""
    files = [
        make_file("large.py", 150),
        make_file("small.py", 20),
    ]

    batcher = Batcher(max_batch_bytes=100)

    batches = batcher.create_batches(files)

    assert len(batches) == 2

    assert batches[0].file_count == 1
    assert batches[0].total_bytes == 150
    assert batches[0].files[0].path == "large.py"

    assert batches[1].file_count == 1
    assert batches[1].total_bytes == 20


def test_batch_ids_are_sequential() -> None:
    """Batch IDs should start at one and increase sequentially."""
    files = [
        make_file("a.py", 60),
        make_file("b.py", 60),
        make_file("c.py", 60),
    ]

    batcher = Batcher(max_batch_bytes=100)

    batches = batcher.create_batches(files)

    assert [batch.batch_id for batch in batches] == [1, 2, 3]


def test_original_file_order_is_preserved() -> None:
    """Batching should not reorder repository files."""
    files = [
        make_file("first.py", 40),
        make_file("second.py", 40),
        make_file("third.py", 40),
        make_file("fourth.py", 40),
    ]

    batcher = Batcher(max_batch_bytes=80)

    batches = batcher.create_batches(files)

    flattened_paths = [file.path for batch in batches for file in batch.files]

    assert flattened_paths == [
        "first.py",
        "second.py",
        "third.py",
        "fourth.py",
    ]


def test_unicode_size_uses_utf8_bytes() -> None:
    """Batch size should be based on encoded UTF-8 bytes."""
    file = SanitizedFile(
        path="unicode.py",
        content="é" * 10,
    )

    batcher = Batcher(max_batch_bytes=20)

    batches = batcher.create_batches([file])

    assert batches[0].total_bytes == 20


def test_invalid_batch_size_is_rejected() -> None:
    """A non-positive batch size should fail immediately."""
    with pytest.raises(ValueError, match="greater than zero"):
        Batcher(max_batch_bytes=0)
