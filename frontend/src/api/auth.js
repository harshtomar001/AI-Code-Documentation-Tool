import api from "./client";

export const registerUser = async (data) => {
  const response = await api.post("/api/auth/register", data);
  return response.data;
};

export const verifyEmail = async (data) => {
  const response = await api.post(
    "/api/auth/verify-email",
    data
  );

  return response.data;
};

export const resendOTP = async (data) => {
  const response = await api.post("/api/auth/resend-otp", data);
  return response.data;
};

export const loginUser = async (data) => {
  const response = await api.post("/api/auth/login", data);
  return response.data;
};

export const forgotPassword = async (data) => {
  const response = await api.post("/api/auth/forgot-password", data);
  return response.data;
};

export const resendResetOTP = async (data) => {
  const response = await api.post("/api/auth/resend-reset-otp", data);
  return response.data;
};

export const resetPassword = async (data) => {
  const response = await api.post("/api/auth/reset-password", data);
  return response.data;
};

export const getCurrentUser = async (token) => {
  const response = await api.get("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateCurrentUser = async (data, token) => {
  const response = await api.put("/api/auth/me", data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const changePassword = async (data, token) => {
  const response = await api.post("/api/auth/change-password", data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

