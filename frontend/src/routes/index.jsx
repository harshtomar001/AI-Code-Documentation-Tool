import { Routes, Route } from "react-router-dom";
import Landing from "../pages/Landing/landing";
import Login from "../pages/Login/login";
import Register from "../pages/Register/Register";
import Dashboard from "../pages/Dashboard/dashboard";
import OAuthCallback from "../pages/OAuthCallback/OAuthCallback";
import Repository from "../pages/Repository/Repository";
import Forgot from "../pages/Login/Forgot";
import ProtectedRoute from "./ProtectedRoute";
import History from "../pages/History/History.jsx";
import Documentation from "../pages/Documentation/Documentation.jsx"
import DocPilot from "../pages/DocPilot/DocPilot";
import Projects from "../pages/Projects/Projects";
import Settings from "../pages/Settings/Settings";
import DashboardLayout from "../layouts/DashboardLayout";
function AppRoutes() {
  return (
    <Routes>

      <Route
        path="/"
        element={<Landing />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />
      <Route path="/forgot-password" element={<Forgot />} />
      {/* OAuth callback MUST be public */}
      <Route
        path="/oauth/callback"
        element={<OAuthCallback />}
      />

      {/* Protected pages */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />
          <Route
            path="/repository/:owner/:repo"
            element={<Repository />}
          />
          <Route
          path="/repository/uploaded/:projectId"
          element={<Repository />}

        />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/documentation/:projectId" element={<Documentation />} />
            <Route path="/documentation/uploaded/:projectId" element={<Documentation />} />

            <Route path= "/history"  element={<History />} />

            <Route path="/docpilot" element={<DocPilot />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/settings" element={<Settings />} />

        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;