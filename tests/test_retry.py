from core_ai.ai.retry import retry_with_backoff


def test_retry_succeeds_after_transient_failure(monkeypatch):
    attempts = 0

    def operation():
        nonlocal attempts
        attempts += 1

        if attempts < 3:
            raise RuntimeError("temporary failure")

        return "success"

    monkeypatch.setattr(
        "core_ai.ai.retry.time.sleep",
        lambda _: None,
    )

    result = retry_with_backoff(
        operation,
        retries=2,
        delay=1,
    )

    assert result == "success"
    assert attempts == 3


def test_retry_raises_after_all_attempts_fail(monkeypatch):
    attempts = 0

    def operation():
        nonlocal attempts
        attempts += 1
        raise RuntimeError("permanent failure")

    monkeypatch.setattr(
        "core_ai.ai.retry.time.sleep",
        lambda _: None,
    )

    try:
        retry_with_backoff(
            operation,
            retries=2,
            delay=1,
        )
    except RuntimeError as exc:
        assert str(exc) == "permanent failure"
    else:
        raise AssertionError("Expected RuntimeError")

    assert attempts == 3