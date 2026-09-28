"""Models for backend job management."""

from typing import Literal

from pydantic import BaseModel

JobStatus = Literal[
    "queued",
    "running",
    "completed",
    "failed",
]


class JobInfo(BaseModel):
    """Represent the current state of a documentation job."""

    job_id: str
    status: JobStatus
    message: str
