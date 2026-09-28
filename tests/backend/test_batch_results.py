from backend.services.jobs.batch_results import BatchResult, BatchResultStore


def make_result(job_id: str, batch_id: int) -> BatchResult:
    return BatchResult(
        job_id=job_id,
        batch_id=batch_id,
        total_batches=2,
        files=[],
        changes=[],
        readme=None,
    )


def test_batch_result_store_saves_and_gets_result() -> None:
    store = BatchResultStore()
    result = make_result("job-1", 1)

    store.save(result)

    assert store.get("job-1", 1) == result
    assert store.get("job-1", 2) is None


def test_batch_result_store_returns_batches_in_order() -> None:
    store = BatchResultStore()

    batch_2 = make_result("job-1", 2)
    batch_1 = make_result("job-1", 1)

    store.save(batch_2)
    store.save(batch_1)

    assert store.get_all("job-1") == [batch_1, batch_2]


def test_batch_result_store_counts_batches() -> None:
    store = BatchResultStore()

    store.save(make_result("job-1", 1))
    store.save(make_result("job-1", 2))

    assert store.count("job-1") == 2
    assert store.count("unknown-job") == 0


def test_batch_result_store_clear_removes_job_results() -> None:
    store = BatchResultStore()

    store.save(make_result("job-1", 1))
    store.save(make_result("job-1", 2))

    store.clear("job-1")

    assert store.get_all("job-1") == []
    assert store.count("job-1") == 0
