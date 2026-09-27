"""Tests for the backend job event broker."""

import asyncio

from backend.services.jobs.event_broker import JobEventBroker
from core_ai.events import JobEvent


def create_event(job_id: str, message: str) -> JobEvent:
    """Create a test job event."""
    return JobEvent(
        job_id=job_id,
        stage="job",
        type="info",
        message=message,
    )


def test_publish_delivers_to_active_subscriber() -> None:
    """Published events should reach active subscribers."""

    async def run_test() -> None:
        broker = JobEventBroker()
        queue = broker.subscribe("job-1")

        event = create_event("job-1", "hello")

        await broker.publish(event)

        received = await queue.get()

        assert received == event

    asyncio.run(run_test())


def test_late_subscriber_receives_event_history() -> None:
    """A late subscriber should receive previously emitted events."""

    async def run_test() -> None:
        broker = JobEventBroker()

        event1 = create_event("job-1", "started")
        event2 = create_event("job-1", "completed")

        await broker.publish(event1)
        await broker.publish(event2)
        await broker.close_job("job-1")

        queue = broker.subscribe("job-1")

        assert await queue.get() == event1
        assert await queue.get() == event2
        assert await queue.get() is None

    asyncio.run(run_test())


def test_multiple_jobs_have_separate_history() -> None:
    """Events from different jobs should remain isolated."""

    async def run_test() -> None:
        broker = JobEventBroker()

        event1 = create_event("job-1", "job one")
        event2 = create_event("job-2", "job two")

        await broker.publish(event1)
        await broker.publish(event2)

        queue = broker.subscribe("job-1")

        assert await queue.get() == event1
        assert queue.empty()

    asyncio.run(run_test())


def test_closed_job_immediately_closes_late_subscription() -> None:
    """A late subscriber to a closed job should receive the close sentinel."""

    async def run_test() -> None:
        broker = JobEventBroker()

        await broker.close_job("job-1")

        queue = broker.subscribe("job-1")

        assert await queue.get() is None

    asyncio.run(run_test())


def test_unsubscribe_removes_subscriber() -> None:
    """Unsubscribing should remove the active subscriber."""

    broker = JobEventBroker()
    queue = broker.subscribe("job-1")

    assert broker.subscriber_count("job-1") == 1

    broker.unsubscribe("job-1", queue)

    assert broker.subscriber_count("job-1") == 0
