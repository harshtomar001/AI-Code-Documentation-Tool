import {
  createJobEventSource,
  getJob,
  getJobBatches,
  getBatchResult,
  uploadRepository,
} from "../../../api/jobs.js";

/**
 * Start a documentation job from a local ZIP repository.
 */
export async function startLocalJob(file, repositoryName, token = null) {
  return uploadRepository(file, repositoryName, token);
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
    "secret",
    "secure",
    "batch",
    "gen",
    "ready",
    "commit",
    "done",
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

  source.onerror = (error) => {
    handlers.onError?.(error);
  };

  source.onopen = () => {
    handlers.onOpen?.();
  };

  return source;
}
