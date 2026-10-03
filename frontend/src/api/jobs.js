import api from "./client";

/**
 * Upload a local repository ZIP and start a documentation job.
 */
export async function uploadRepository(
  file,
  repositoryName = "repository",
  token = null
) {
  const formData = new FormData();

  formData.append("repository", file);
  formData.append("repository_name", repositoryName);

  const config = {};

  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await api.post(
    "/api/jobs/upload",
    formData,
    config
  );

  return response.data;
}


/**
 * Start a documentation job for an already-uploaded project.
 */
export async function createProjectJob(
      projectId,
      repositoryName = "repository",
      token = null
    ) {
      if (!projectId) {
        throw new Error("Project ID is required.");
      }

      const config = {};

      if (token) {
        config.headers = {
          Authorization: `Bearer ${token}`,
        };
      }

      const response = await api.post(
        "/api/jobs",
        {
          project_id: projectId,
          repository_name: repositoryName,
        },
        config
      );

      return response.data;
    }

/**
 * Get the current state of a documentation job.
 */
export async function getJob(jobId, token = null) {
  const config = {};

  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await api.get(
    `/api/jobs/${encodeURIComponent(jobId)}`,
    config
  );

  return response.data;
}

/**
 * Get all completed batch results for a job.
 */
export async function getJobBatches(jobId, token = null) {
  const config = {};

  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await api.get(
    `/api/jobs/${encodeURIComponent(jobId)}/batches`,
    config
  );

  return response.data;
}

/**
 * Get one completed batch result.
 */
export async function getBatchResult(
  jobId,
  batchId,
  token = null
) {
  const config = {};

  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await api.get(
    `/api/jobs/${encodeURIComponent(jobId)}/batches/${batchId}`,
    config
  );

  return response.data;
}

/**
 * Open the SSE stream for a documentation job.
 */
export function createJobEventSource(jobId) {
  const baseURL =
    api.defaults.baseURL || window.location.origin;

  return new EventSource(
    `${baseURL}/api/jobs/${encodeURIComponent(jobId)}/events`,
    {
      withCredentials: true,
    }
  );
}