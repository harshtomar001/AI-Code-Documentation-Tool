import api from "./client";

const authConfig = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const getProjects = async (token) => {
  const response = await api.get(
    "/api/projects",
    authConfig(token)
  );
  return response.data;
};

export const getProject = async (token, projectId) => {
  const response = await api.get(
    `/api/projects/${projectId}`,
    authConfig(token)
  );
  return response.data;
};

export const createProject = async (token, project) => {
  const response = await api.post(
    "/api/projects",
    project,
    authConfig(token)
  );
  return response.data;
};

export const deleteProject = async (token, projectId) => {
  const response = await api.delete(
    `/api/projects/${projectId}`,
    authConfig(token)
  );
  return response.data;
};
