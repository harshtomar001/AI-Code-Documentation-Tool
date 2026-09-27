
import { Routes, Route } from "react-router-dom";

import Landing from "../Pages/Landing/landing";
import Login from "../Pages/Login/login";
import Register from "../Pages/Register/Register";
import Dashboard from "../Pages/Dashboard/dashboard";
import OAuthCallback from "../Pages/OAuthCallback/OAuthCallback";
import Forgot from "../Pages/Login/Forgot";
import ProtectedRoute from "./ProtectedRoute";

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
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
      </Route>

    </Routes>
  );
}

export default AppRoutes;