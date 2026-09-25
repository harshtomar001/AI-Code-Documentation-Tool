import { Routes, Route } from "react-router-dom";

import Landing from "../Pages/Landing/Landing";
import Login from "../Pages/Login/login";
import Forgot from "../Pages/Login/Forgot";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<Forgot />} />
    </Routes>
  );
};

export default AppRoutes;