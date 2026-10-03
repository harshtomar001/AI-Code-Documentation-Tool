import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      sessionStorage.removeItem("access_token");
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiError(error) {
  if (!error?.response) {
    return "Unable to connect to the backend. Check your connection and try again.";
  }
  const status = error.response.status;
  if (status === 401) {
    return "Authentication expired. Please log in again.";
  }
  if (status === 404) {
    return (
      error.response.data?.detail ||
      "Requested resource was not found."
    );
  }
  if (status === 500) {
    return "Something went wrong while processing the project. Please try again.";
  }
  if (status === 400) {
    return error.response.data?.detail || "Invalid request.";
  }
  return (
    error.response.data?.detail ||
    error.message ||
    "An unexpected error occurred."
  );
}

export default api;