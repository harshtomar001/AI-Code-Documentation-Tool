"""Models for live Core AI job events."""

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field

EventStage = Literal[
    "upload",
    "server",
    "scan",
    "ast",
    "security",
    "redaction",
    "batching",
    "batch",
    "generation",
    "job",
]

EventType = Literal[
    "started",
    "progress",
    "completed",
    "finding",
    "info",
    "failed",
]


class EventProgress(BaseModel):
    """Represent progress for a pipeline stage."""

    current: int
    total: int


class JobEvent(BaseModel):
    """Represent one live event emitted by a Core AI job."""

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    job_id: str
    stage: EventStage
    type: EventType
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    progress: EventProgress | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
