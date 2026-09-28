import api from "./client";

/**
 * Check whether the current user has connected GitHub.
 */
export async function getGitHubStatus(token) {
  const response = await api.get("/api/github/status", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Get GitHub OAuth authorization URL.
 */
export async function getGitHubConnectUrl(token) {
  const response = await api.get("/api/github/connect", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    withCredentials: true,
  });

  return response.data.url;
}

/**
 * Fetch repositories of the connected GitHub account.
 */
export async function getGitHubRepositories(token) {
  const response = await api.get("/api/github/repositories", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

/**
 * Disconnect GitHub from the current DocuAI account.
 */
export async function disconnectGitHub(token) {
  const response = await api.post(
    "/api/github/disconnect",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

export async function getGitHubRepository(
  token,
  owner,
  repo
) {
  const response = await api.get(
    `/api/github/repositories/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(repo)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

export async function getGitHubFile(
  token,
  owner,
  repo,
  path
) {
  const response = await api.get(
    `/api/github/repositories/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(repo)}/file`,
    {
      params: {
        path,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}