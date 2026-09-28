from fastapi.testclient import TestClient

from backend.main import app
from backend.routes.jobs.jobs import job_manager
from backend.services.jobs import BatchResult


def make_result(job_id: str, batch_id: int) -> BatchResult:
    return BatchResult(
        job_id=job_id,
        batch_id=batch_id,
        total_batches=2,
        files=[],
        changes=[],
        readme=None,
    )


def test_get_job_batches_returns_results_in_order() -> None:
    job_id = "api-test-job"

    job_manager.save_batch_result(make_result(job_id, 2))
    job_manager.save_batch_result(make_result(job_id, 1))

    client = TestClient(app)

    response = client.get(f"/api/jobs/{job_id}/batches")

    assert response.status_code == 200

    data = response.json()

    assert [item["batch_id"] for item in data] == [1, 2]
    assert all(item["job_id"] == job_id for item in data)


def test_get_single_batch_result() -> None:
    job_id = "single-batch-test-job"

    job_manager.save_batch_result(make_result(job_id, 1))

    client = TestClient(app)

    response = client.get(f"/api/jobs/{job_id}/batches/1")

    assert response.status_code == 200

    data = response.json()

    assert data["job_id"] == job_id
    assert data["batch_id"] == 1
    assert data["total_batches"] == 2
    assert data["status"] == "completed"


def test_get_missing_batch_result_returns_404() -> None:
    client = TestClient(app)

    response = client.get(
        "/api/jobs/nonexistent-test-job/batches/99"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Batch result not found"
