import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuth = () => {
      const hash = window.location.hash;

      console.log("========== OAUTH CALLBACK ==========");
      console.log("Current URL:", window.location.href);
      console.log("Hash:", hash);

      if (!hash || !hash.includes("access_token=")) {
        console.error("OAuth access token not found");

        navigate("/login", {
          replace: true,
        });

        return;
      }

      const params = new URLSearchParams(
        hash.substring(1)
      );

      const token = params.get("access_token");

      console.log("OAuth token received:", !!token);

      if (!token) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      // Clear any old token
      localStorage.removeItem("access_token");
      sessionStorage.removeItem("access_token");

      // Save new OAuth token
      localStorage.setItem(
        "access_token",
        token
      );

      // Remove token from address bar
      window.history.replaceState(
        {},
        document.title,
        "/oauth/callback"
      );

      console.log("Token saved successfully");
      console.log("Redirecting to dashboard...");

      // IMPORTANT:
      // Use window.location instead of navigate
      // so the dashboard starts with the saved token.
      window.location.replace("/dashboard");
    };

    handleOAuth();
  }, [navigate]);

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
      Signing you in...
    </div>
  );
}

export default OAuthCallback;