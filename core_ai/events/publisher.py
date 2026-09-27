"""Event publishing utilities for Core AI jobs."""

from collections.abc import Callable

from .models import EventProgress, EventStage, EventType, JobEvent

EventListener = Callable[[JobEvent], None]


class EventPublisher:
    """Publish job events to registered listeners."""

    def __init__(self) -> None:
        """Initialize an empty event publisher."""
        self._listeners: list[EventListener] = []

    def subscribe(self, listener: EventListener) -> None:
        """Register a listener to receive future events."""
        if listener not in self._listeners:
            self._listeners.append(listener)

    def unsubscribe(self, listener: EventListener) -> None:
        """Remove a previously registered listener."""
        if listener in self._listeners:
            self._listeners.remove(listener)

    def publish(self, event: JobEvent) -> None:
        """Send an event to all registered listeners."""
        for listener in tuple(self._listeners):
            listener(event)

    def emit(
        self,
        *,
        job_id: str,
        stage: EventStage,
        type: EventType,
        message: str,
        progress: EventProgress | None = None,
        metadata: dict[str, object] | None = None,
    ) -> JobEvent:
        """Create and publish a job event."""
        event = JobEvent(
            job_id=job_id,
            stage=stage,
            type=type,
            message=message,
            progress=progress,
            metadata=metadata or {},
        )
        self.publish(event)
        return event
