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
 * Commit one completed batch result.
 */
export async function commitJobBatch(
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

  const response = await api.post(
    `/api/jobs/${encodeURIComponent(jobId)}/batches/${batchId}/commit`,
    {},
    config
  );

  return response.data;
}

/**
 * Commit all completed batches for a job.
 */
export async function commitAllJobBatches(
  jobId,
  token = null
) {
  const config = {};

  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await api.post(
    `/api/jobs/${encodeURIComponent(jobId)}/commit`,
    {},
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

/**
 * Download the documented repository as a ZIP archive.
 */
export async function downloadJobArchive(
  jobId,
  token = null,
  repositoryName = "repository"
) {
  const config = {
    responseType: "blob",
  };

  if (token) {
    config.headers = {
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await api.get(
    `/api/jobs/${encodeURIComponent(jobId)}/download`,
    config
  );

  const blob = new Blob([response.data], { type: "application/zip" });
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  const safeName = (repositoryName || "repository").replace(
    /[^a-zA-Z0-9_\-\.]/g,
    "_"
  );
  anchor.download = `${safeName}_documented.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(downloadUrl);
}