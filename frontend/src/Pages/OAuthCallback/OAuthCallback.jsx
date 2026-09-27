import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.hash.substring(1)
    );

    const token = params.get("access_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    localStorage.setItem(
      "access_token",
      token
    );

    window.history.replaceState(
      {},
      document.title,
      "/oauth/callback"
    );

    navigate("/dashboard", {
      replace: true,
    });
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h2>Signing you in...</h2>
    </div>
  );
}

export default OAuthCallback;