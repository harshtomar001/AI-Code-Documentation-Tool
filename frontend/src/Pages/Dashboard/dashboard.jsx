import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/auth";
import "./dashboard.css";

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const data = await getCurrentUser(token);
        setUser(data);
      } catch {
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("access_token");
        navigate("/login", { replace: true });
      }
    };

    loadUser();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");
    navigate("/login", { replace: true });
  };

  if (!user) {
    return <div style={{ padding: 40 }}>Loading dashboard...</div>;
  }

  return (
    <main style={{ padding: "40px" }}>
      <h1>Welcome, {user.name}</h1>
      <p>{user.email}</p>
      <p>Verification: {user.is_verified ? "Verified" : "Not verified"}</p>
      <p>Login methods: {user.providers?.join(", ") || "local"}</p>
      <button onClick={logout}>Logout</button>
    </main>
  );
}

export default Dashboard;
