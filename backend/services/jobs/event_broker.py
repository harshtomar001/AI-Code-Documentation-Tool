"""Job event broker for streaming Core AI events."""

import asyncio

from core_ai.events import JobEvent


class JobEventBroker:
    """Maintain per-job event history and live subscriber queues."""

    def __init__(self) -> None:
        """Initialize the broker with no active jobs or event history."""
        self._queues: dict[str, set[asyncio.Queue[JobEvent | None]]] = {}
        self._events: dict[str, list[JobEvent]] = {}
        self._closed_jobs: set[str] = set()

    def subscribe(self, job_id: str) -> asyncio.Queue[JobEvent | None]:
        """Subscribe to a job and replay events already emitted."""
        queue: asyncio.Queue[JobEvent | None] = asyncio.Queue()

        self._queues.setdefault(job_id, set()).add(queue)

        for event in self._events.get(job_id, []):
            queue.put_nowait(event)

        if job_id in self._closed_jobs:
            queue.put_nowait(None)

        return queue

    def unsubscribe(
        self,
        job_id: str,
        queue: asyncio.Queue[JobEvent | None],
    ) -> None:
        """Remove a queue from a job and clean up empty subscriber sets."""
        queues = self._queues.get(job_id)

        if queues is None:
            return

        queues.discard(queue)

        if not queues:
            self._queues.pop(job_id, None)

    async def publish(self, event: JobEvent) -> None:
        """Store an event and publish it to active subscribers."""
        self._events.setdefault(event.job_id, []).append(event)

        queues = self._queues.get(event.job_id, set())

        for queue in tuple(queues):
            await queue.put(event)

    async def close_job(self, job_id: str) -> None:
        """Mark a job complete and close all active event streams."""
        self._closed_jobs.add(job_id)

        queues = self._queues.get(job_id, set())

        for queue in tuple(queues):
            await queue.put(None)

    def subscriber_count(self, job_id: str) -> int:
        """Return the number of active subscribers for a job."""
        return len(self._queues.get(job_id, set()))

    def has_events(self, job_id: str) -> bool:
        """Return True if the broker has recorded events for a job."""
        return bool(self._events.get(job_id))

    def is_closed(self, job_id: str) -> bool:
        """Return True if the job has been closed."""
        return job_id in self._closed_jobs
