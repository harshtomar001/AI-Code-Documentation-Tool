"""Tests for the Core AI live event system."""

from datetime import UTC

import pytest

from core_ai.events import EventProgress, EventPublisher, JobEvent


def test_job_event_generates_id_and_timestamp() -> None:
    """A job event should automatically receive an ID and timestamp."""
    event = JobEvent(
        job_id="job_123",
        stage="scan",
        type="started",
        message="Scanning repository",
    )

    assert event.event_id
    assert event.timestamp.tzinfo == UTC
    assert event.progress is None
    assert event.metadata == {}


def test_job_event_supports_progress_and_metadata() -> None:
    """Events should carry progress and structured metadata."""
    event = JobEvent(
        job_id="job_123",
        stage="scan",
        type="progress",
        message="Scanning files",
        progress=EventProgress(current=50, total=100),
        metadata={
            "last_file": "src/invoice.py",
        },
    )

    assert event.progress is not None
    assert event.progress.current == 50
    assert event.progress.total == 100
    assert event.metadata["last_file"] == "src/invoice.py"


def test_publisher_emits_event_to_listener() -> None:
    """Subscribed listeners should receive published events."""
    publisher = EventPublisher()
    received: list[JobEvent] = []

    publisher.subscribe(received.append)

    event = publisher.emit(
        job_id="job_123",
        stage="scan",
        type="started",
        message="Scanning repository",
    )

    assert received == [event]


def test_publisher_supports_multiple_listeners() -> None:
    """Multiple listeners should receive the same event."""
    publisher = EventPublisher()

    first: list[JobEvent] = []
    second: list[JobEvent] = []

    publisher.subscribe(first.append)
    publisher.subscribe(second.append)

    event = publisher.emit(
        job_id="job_123",
        stage="security",
        type="finding",
        message="Secret found",
    )

    assert first == [event]
    assert second == [event]


def test_unsubscribe_stops_future_events() -> None:
    """Unsubscribed listeners should not receive future events."""
    publisher = EventPublisher()
    received: list[JobEvent] = []

    publisher.subscribe(received.append)
    publisher.unsubscribe(received.append)

    publisher.emit(
        job_id="job_123",
        stage="job",
        type="completed",
        message="Job completed",
    )

    assert received == []


def test_duplicate_subscription_is_ignored() -> None:
    """The same listener should not be registered twice."""
    publisher = EventPublisher()
    received: list[JobEvent] = []

    publisher.subscribe(received.append)
    publisher.subscribe(received.append)

    publisher.emit(
        job_id="job_123",
        stage="job",
        type="started",
        message="Job started",
    )

    assert len(received) == 1


def test_invalid_stage_is_rejected() -> None:
    """Unknown event stages should be rejected by validation."""
    with pytest.raises(ValueError):
        JobEvent(
            job_id="job_123",
            stage="unknown",
            type="started",
            message="Invalid event",
        )


def test_invalid_type_is_rejected() -> None:
    """Unknown event types should be rejected by validation."""
    with pytest.raises(ValueError):
        JobEvent(
            job_id="job_123",
            stage="scan",
            type="unknown",
            message="Invalid event",
        )


def test_event_can_be_serialized_for_sse() -> None:
    """Events should serialize cleanly to JSON for future SSE delivery."""
    event = JobEvent(
        job_id="job_123",
        stage="batching",
        type="progress",
        message="Creating batches",
        progress=EventProgress(current=4, total=10),
    )

    payload = event.model_dump(mode="json")

    assert payload["job_id"] == "job_123"
    assert payload["stage"] == "batching"
    assert payload["type"] == "progress"
    assert payload["progress"]["current"] == 4
