from types import SimpleNamespace

from backend.services.jobs import JobEventBroker, JobManager, JobWorker


class FakePipeline:
    """Minimal pipeline that reports one completed batch."""

    def __init__(self) -> None:
        self.batch_result_handler = None

    def run(self, repository_path: str, repository_name: str) -> None:
        assert self.batch_result_handler is not None

        ai_result = SimpleNamespace(
            documentation=SimpleNamespace(
                files=[],
                readme=None,
            ),
            changes=[],
        )

        self.batch_result_handler(
            1,
            1,
            ai_result,
        )


def test_worker_stores_batch_result_before_emitting_completion() -> None:
    """Batch results must be stored before the completion event is emitted."""
    job_manager = JobManager()
    event_broker = JobEventBroker()
    pipeline = FakePipeline()

    job = job_manager.create_job()

    ordering: list[str] = []

    original_save = job_manager.save_batch_result

    def tracking_save(result):
        ordering.append("saved")
        return original_save(result)

    job_manager.save_batch_result = tracking_save

    publisher = job_manager.get_publisher(job.job_id)
    assert publisher is not None

    original_emit = publisher.emit

    def tracking_emit(*args, **kwargs):
        if (
            kwargs.get("stage") == "batch"
            and kwargs.get("type") == "completed"
        ):
            ordering.append("batch_event")
        return original_emit(*args, **kwargs)

    publisher.emit = tracking_emit

    worker = JobWorker(
        job_manager=job_manager,
        event_broker=event_broker,
        pipeline=pipeline,
    )

    import asyncio

    asyncio.run(
        worker.run(
            job.job_id,
            "test-repository",
            "test-repository",
        )
    )

    assert ordering == ["saved", "batch_event"]

    result = job_manager.get_batch_result(job.job_id, 1)

    assert result is not None
    assert result.batch_id == 1
    assert result.total_batches == 1
