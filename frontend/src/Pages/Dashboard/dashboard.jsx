import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/auth";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ActionCards from "./components/ActionCards";
import RecentProjects from "./components/RecentProjects";
import ReviewRequired from "./components/ReviewRequired";
import DocumentationOverview from "./components/DocumentationOverview";
import DocumentationChart from "./components/DocumentationChart";
import Tips from "./components/Tips";
import Toast from "./components/Toast";

const projectsData = [
  {
    id: 1,
    name: "Student ERP",
    tags: ["Python", "Web App"],
    progress: 68,
  },
  {
    id: 2,
    name: "Weather API",
    tags: ["JavaScript", "API"],
    progress: 42,
  },
  {
    id: 3,
    name: "Portfolio",
    tags: ["HTML", "CSS"],
    progress: 100,
  },
];

const reviewsData = [
  {
    id: 1,
    title: "Update API endpoints",
    description: "3 changes • 2 comments",
  },
  {
    id: 2,
    title: "Student ERP",
    description: "7 docstrings • 3 comments • 1 README",
  },
  {
    id: 3,
    title: "Fix authentication flow",
    description: "5 changes • 4 comments",
  },
];

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

/* =========================================================
   GITHUB CALLBACK MESSAGE
   ========================================================= */

function getGitHubMessage() {
  const params = new URLSearchParams(window.location.search);

  const githubError = params.get("github_error");

  if (githubError) {
    console.log("GitHub callback error:", githubError);
    return githubError;
  }

  const githubStatus = params.get("github");

  if (githubStatus === "connected") {
    console.log("GitHub connected successfully");
    return "GitHub connected successfully";
  }

  return "";
}

export default function Dashboard() {
  const navigate = useNavigate();

  /* =======================================================
     USER
     ======================================================= */

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  /* =======================================================
     PROJECTS / REVIEWS
     ======================================================= */

  const [projects, setProjects] = useState(projectsData);
  const [reviews, setReviews] = useState(reviewsData);

  /* =======================================================
     UI STATE
     ======================================================= */

  const [search, setSearch] = useState("");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [darkMode, setDarkMode] = useState(true);

  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [month, setMonth] = useState("This month");

  /* =======================================================
     MESSAGE
     ======================================================= */

  const [message, setMessage] = useState(() =>
    getGitHubMessage()
  );

  /* =======================================================
     NOTIFICATION / TOAST
     ======================================================= */

  const notify = (text) => {
    setMessage(text);
  };

  /* =======================================================
     LOAD CURRENT USER
     ======================================================= */

  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();

      if (!token) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      try {
        const data = await getCurrentUser(token);

        console.log(
          "Authenticated user:",
          data
        );

        setUser(data);
      } catch (error) {
        console.error(
          "Failed to load current user:",
          error
        );

        localStorage.removeItem(
          "access_token"
        );

        sessionStorage.removeItem(
          "access_token"
        );

        navigate("/login", {
          replace: true,
        });
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [navigate]);

  /* =======================================================
     CLEAN GITHUB QUERY PARAMETERS
     
     IMPORTANT:
     Message is already stored in state above,
     so removing the query from URL will NOT remove
     the toast message.
     ======================================================= */

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const hasGitHubMessage =
      params.has("github_error") ||
      params.get("github") === "connected";

    if (!hasGitHubMessage) {
      return;
    }

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }, []);

  /* =======================================================
     FILTER PROJECTS
     ======================================================= */

  const filteredProjects = useMemo(() => {
    if (!search.trim()) {
      return projects;
    }

    const value = search.toLowerCase();

    return projects.filter((project) =>
      project.name
        .toLowerCase()
        .includes(value)
    );
  }, [projects, search]);

  /* =======================================================
     CREATE PROJECT
     ======================================================= */

  const createProject = () => {
    const newProject = {
      id: Date.now(),
      name: "New Project",
      tags: ["JavaScript", "Web App"],
      progress: 0,
    };

    setProjects((current) => [
      newProject,
      ...current,
    ]);

    notify("New project created");
  };

  /* =======================================================
     REVIEW PROJECT
     ======================================================= */

  const reviewProject = (id) => {
    setReviews((current) =>
      current.filter(
        (review) => review.id !== id
      )
    );

    notify("Review completed");
  };

  /* =======================================================
     LOGOUT
     ======================================================= */

  const logout = () => {
    localStorage.removeItem(
      "access_token"
    );

    sessionStorage.removeItem(
      "access_token"
    );

    navigate("/login", {
      replace: true,
    });
  };

  /* =======================================================
     SIDEBAR MENU
     ======================================================= */

  const selectMenu = (item) => {
    setActiveMenu(item);

    if (item !== "Dashboard") {
      notify(`${item} selected`);
    }
  };

  /* =======================================================
     LOADING
     ======================================================= */

  if (loadingUser || !user) {
    return (
      <div className="p-10">
        Loading dashboard...
      </div>
    );
  }

  /* =======================================================
     USER INFORMATION
     ======================================================= */

  const userName =
    user.name || "User";

  const userEmail =
    user.email || "";

  const avatarLetter = userName
    .charAt(0)
    .toUpperCase();

  const providers =
    user.providers?.length
      ? user.providers.join(", ")
      : "local";

  const verificationText =
    user.is_verified
      ? "Verified"
      : "Not verified";

  /* =======================================================
     PAGE THEME
     ======================================================= */

  const page = darkMode
    ? "bg-[#0d0f10] text-[#f2f3f4]"
    : "bg-[#f4f5f6] text-[#17191c]";

  /* =======================================================
     DASHBOARD
     ======================================================= */

  return (
    <div
      className={`
        min-h-screen
        w-full
        font-[Inter,-apple-system,BlinkMacSystemFont,"Segoe_UI",Arial,sans-serif]
        ${page}
      `}
    >
      {/* =================================================
          SIDEBAR
          ================================================= */}

      <Sidebar
        activeMenu={activeMenu}
        onMenuChange={selectMenu}
        darkMode={darkMode}
      />

      {/* =================================================
          MAIN
          ================================================= */}

      <main
        className="
          ml-[250px]
          min-h-screen
          w-[calc(100%-250px)]
          max-[850px]:ml-[210px]
          max-[850px]:w-[calc(100%-210px)]
          max-[700px]:ml-0
          max-[700px]:w-full
        "
      >
        {/* =================================================
            TOPBAR
            ================================================= */}

        <Topbar
          search={search}
          setSearch={setSearch}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          showNotifications={
            showNotifications
          }
          setShowNotifications={
            setShowNotifications
          }
          showProfile={showProfile}
          setShowProfile={
            setShowProfile
          }
          userName={userName}
          avatarLetter={avatarLetter}
          userEmail={userEmail}
          verificationText={
            verificationText
          }
          providers={providers}
          reviewsCount={reviews.length}
          onNotify={notify}
          onLogout={logout}
        />

        {/* =================================================
            CONTENT
            ================================================= */}

        <div
          className="
            mx-auto
            max-w-[1280px]
            px-11
            pb-[45px]
            pt-[31px]
            max-[1100px]:px-[25px]
          "
        >
          {/* =================================================
              HEADER
              ================================================= */}

          <section
            className="
              mb-[15px]
              flex
              items-start
              justify-between
              max-[700px]:flex-col
              max-[700px]:gap-[18px]
            "
          >
            <div>
              <h1
                className="
                  text-[34px]
                  font-semibold
                  tracking-[-1px]
                  max-[700px]:text-[28px]
                "
              >
                Good Evening,{" "}
                <span className="text-[#ef5148]">
                  {userName}
                </span>{" "}
                👋
              </h1>

              <p
                className={`
                  mt-1.5
                  text-[17px]
                  ${
                    darkMode
                      ? "text-[#9fa5ab]"
                      : "text-[#5d6369]"
                  }
                `}
              >
                Continue working on your
                documentation.
              </p>
            </div>

            <button
              type="button"
              onClick={createProject}
              className="
                h-[49px]
                rounded-[7px]
                bg-[#ef5148]
                px-[23px]
                text-[15px]
                text-white
                hover:bg-[#f25a51]
                max-[700px]:w-full
              "
            >
              + New Project
            </button>
          </section>

          {/* =================================================
              ACTION CARDS
              ================================================= */}

          <ActionCards
            darkMode={darkMode}
            onImport={() =>
              notify(
                "GitHub import selected"
              )
            }
            onUpload={() =>
              notify(
                "Upload project selected"
              )
            }
          />

          {/* =================================================
              MAIN GRID
              ================================================= */}

          <section
            className="
              grid
              grid-cols-[1.55fr_1fr]
              gap-[22px]
              max-[1100px]:grid-cols-1
            "
          >
            {/* =================================================
                LEFT COLUMN
                ================================================= */}

            <div className="flex flex-col gap-[17px]">
              <RecentProjects
                projects={filteredProjects}
                darkMode={darkMode}
                onViewAll={() =>
                  notify(
                    "Showing all projects"
                  )
                }
              />

              <ReviewRequired
                reviews={reviews}
                darkMode={darkMode}
                onReview={reviewProject}
                onViewAll={() =>
                  notify(
                    "Showing all reviews"
                  )
                }
              />
            </div>

            {/* =================================================
                RIGHT COLUMN
                ================================================= */}

            <div className="flex flex-col gap-[17px]">
              <DocumentationOverview
                month={month}
                setMonth={setMonth}
                reviewsCount={reviews.length}
                darkMode={darkMode}
              />

              <DocumentationChart
                darkMode={darkMode}
              />
            </div>
          </section>

          {/* =================================================
              TIPS
              ================================================= */}

          <Tips
            darkMode={darkMode}
            onViewAll={() =>
              notify("Showing all tips")
            }
          />
        </div>
      </main>

      {/* =====================================================
          TOAST
          ===================================================== */}

      <Toast
        message={message}
        darkMode={darkMode}
      />
    </div>
  );
}