import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Sidebar from "../Pages/Dashboard/components/Sidebar";
import Toast from "../Pages/Dashboard/components/Toast";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(true);
  const [message, setMessage] = useState("");

  const getActiveMenu = () => {
    const path = location.pathname;

    if (path.startsWith("/dashboard")) {
      return "Dashboard";
    }

    if (
      path.startsWith("/projects") ||
      path.startsWith("/repository")
    ) {
      return "Projects";
    }

    if (path.startsWith("/documentation")) {
      return "Documentation";
    }

    if (path.startsWith("/history")) {
      return "History";
    }

    if (path.startsWith("/settings")) {
      return "Settings";
    }

    return "Dashboard";
  };

  const activeMenu = getActiveMenu();

  const handleMenuChange = (item) => {
    const routes = {
      Dashboard: "/dashboard",
      Projects: "/projects",
      Documentation: "/documentation",
      History: "/history",
      Settings: "/settings",
    };

    if (routes[item]) {
      navigate(routes[item]);
    }
  };

  const notify = (text) => {
    setMessage(text);
  };

  return (
    <div
      className={
        darkMode
          ? "min-h-screen bg-[#0d0f10] text-[#f2f3f4]"
          : "min-h-screen bg-[#f4f5f6] text-[#17191c]"
      }
    >
      {/* COMMON SIDEBAR */}
      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={handleMenuChange}
        darkMode={darkMode}
        onNotify={notify}
      />

      {/* ALL PAGES */}
      <main
        className="
          min-h-screen
          ml-[250px]
          w-[calc(100%-250px)]
          max-[850px]:ml-[210px]
          max-[850px]:w-[calc(100%-210px)]
          max-[700px]:ml-0
          max-[700px]:w-full
        "
      >
        <Outlet
          context={{
            darkMode,
            setDarkMode,
            notify,
          }}
        />
      </main>

      <Toast
        message={message}
        darkMode={darkMode}
      />
    </div>
  );
}