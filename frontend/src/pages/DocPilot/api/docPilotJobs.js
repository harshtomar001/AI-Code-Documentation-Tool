import {
  createJobEventSource,
  createProjectJob,
  getJob,
  getJobBatches,
  getBatchResult,
  uploadRepository,
  downloadJobArchive,
} from "../../../api/jobs.js";

export { downloadJobArchive };

/**
 * Start a documentation job from a local ZIP repository.
 *
 * Legacy flow. Kept for compatibility.
 */
export async function startLocalJob(file, repositoryName, token = null) {
  return uploadRepository(file, repositoryName, token);
}

/**
 * Start a documentation job for an already-uploaded project.
 *
 * The backend resolves the repository files from ProjectStorage
 * using the project ID.
 */
export async function startProjectJob(
  projectId,
  repositoryName = "repository",
  token = null
) {
  return createProjectJob(projectId, repositoryName, token);
}

/**
 * Fetch the current job state.
 */
export async function fetchJob(jobId, token = null) {
  return getJob(jobId, token);
}

/**
 * Fetch all completed batches for a job.
 */
export async function fetchJobBatches(jobId, token = null) {
  return getJobBatches(jobId, token);
}

/**
 * Fetch one completed batch.
 */
export async function fetchBatch(jobId, batchId, token = null) {
  return getBatchResult(jobId, batchId, token);
}

/**
 * Subscribe to the backend SSE stream.
 *
 * The caller owns the returned EventSource and must close it.
 */
export function subscribeToJob(jobId, handlers = {}) {
  const source = createJobEventSource(jobId);

  const eventTypes = [
    "upload",
    "server",
    "scan",
    "ast",
    "secret",
    "security",
    "secure",
    "redaction",
    "batch",
    "batching",
    "gen",
    "generation",
    "job",
    "ready",
    "commit",
    "done",
    "error",
  ];

  for (const eventType of eventTypes) {
    source.addEventListener(eventType, (event) => {
      let payload = event.data;

      try {
        payload = JSON.parse(event.data);
      } catch {
        // Keep the original string when the server sends non-JSON data.
      }

      handlers.onEvent?.({
        eventType,
        event,
        payload,
      });
    });
  }

  source.onmessage = (event) => {
    let payload = event.data;

    try {
      payload = JSON.parse(event.data);
    } catch {
      // Keep the original string when the server sends non-JSON data.
    }

    handlers.onEvent?.({
      eventType: payload?.stage || "message",
      event,
      payload,
    });
  };

  source.onerror = (error) => {
    handlers.onError?.(error);
  };

  source.onopen = () => {
    handlers.onOpen?.();
  };

  return source;
}
