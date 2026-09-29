import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import api from "../api/client";

function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthentication = async () => {
      const token =
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("access_token");

      console.log(
        "========== PROTECTED ROUTE =========="
      );

      console.log(
        "Token exists:",
        !!token
      );

      if (!token) {
        console.log(
          "No token → Login"
        );

        setAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(
          "/api/auth/me",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        console.log(
          "Authenticated user:",
          response.data
        );

        setAuthenticated(true);

      } catch (error) {
        console.error(
          "Auth validation failed:",
          error.response?.status,
          error.response?.data
        );

        localStorage.removeItem(
          "access_token"
        );

        sessionStorage.removeItem(
          "access_token"
        );

        setAuthenticated(false);

      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090b",
          color: "#ffffff",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;