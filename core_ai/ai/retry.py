"""Retry utilities for transient AI provider failures."""

import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")


def retry_with_backoff(
    operation: Callable[[], T],
    *,
    retries: int = 2,
    delay: float = 1.0,
    retry_if: tuple[type[Exception], ...] = (Exception,),
) -> T:
    """Retry an operation using exponential backoff.

    Args:
        operation: Callable operation that may temporarily fail.
        retries: Number of retries after the initial attempt.
        delay: Initial delay in seconds.
        retry_if: Exception types that should trigger a retry.

    Returns:
        The successful result returned by the operation.

    Raises:
        Exception: The final exception raised by the operation.
    """
    for attempt in range(retries + 1):
        try:
            return operation()
        except retry_if:
            if attempt == retries:
                raise

            time.sleep(delay * (2**attempt))

    raise RuntimeError("Retry operation failed unexpectedly")