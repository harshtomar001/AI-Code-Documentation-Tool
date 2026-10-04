from fastapi.testclient import TestClient

from main import app
from routes.jobs.jobs import job_manager
from services.jobs import BatchResult


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


def test_commit_single_batch_updates_status() -> None:
    job_id = "commit-single-batch-test"

    job_manager.save_batch_result(make_result(job_id, 1))

    client = TestClient(app)

    # Initially "completed"
    res1 = client.get(f"/api/jobs/{job_id}/batches/1")
    assert res1.status_code == 200
    assert res1.json()["status"] == "completed"

    # Commit batch 1
    post_res = client.post(f"/api/jobs/{job_id}/batches/1/commit")
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "committed"

    # Subsequent GET must return "committed"
    res2 = client.get(f"/api/jobs/{job_id}/batches/1")
    assert res2.status_code == 200
    assert res2.json()["status"] == "committed"


def test_commit_all_batches_updates_status() -> None:
    job_id = "commit-all-batches-test"

    job_manager.save_batch_result(make_result(job_id, 1))
    job_manager.save_batch_result(make_result(job_id, 2))

    client = TestClient(app)

    post_res = client.post(f"/api/jobs/{job_id}/commit")
    assert post_res.status_code == 200
    data = post_res.json()
    assert len(data) == 2
    assert all(b["status"] == "committed" for b in data)

    # Subsequent GET batches must also reflect "committed"
    get_res = client.get(f"/api/jobs/{job_id}/batches")
    assert get_res.status_code == 200
    batches = get_res.json()
    assert len(batches) == 2
    assert all(b["status"] == "committed" for b in batches)

    # GET /api/jobs/{job_id}/commits must return committed batch summaries
    commits_res = client.get(f"/api/jobs/{job_id}/commits")
    assert commits_res.status_code == 200
    commits = commits_res.json()
    assert len(commits) == 2
    for c in commits:
        assert "sha" in c
        assert "message" in c
        assert "batch_ids" in c
        assert "changes" in c
        assert "committed_at" in c

