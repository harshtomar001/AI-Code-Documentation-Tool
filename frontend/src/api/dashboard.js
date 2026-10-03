import api from "./client";

export async function getDocumentationRuns() {
  const response = await api.get("/api/dashboard/documentation-runs");

  return response.data?.runs || [];
}