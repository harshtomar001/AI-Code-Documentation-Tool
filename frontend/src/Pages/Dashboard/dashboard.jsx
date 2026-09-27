import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/auth";
import "./dashboard.css";

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

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

function Dashboard() {
  const navigate = useNavigate();

  // =========================
  // AUTH USER
  // =========================
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // =========================
  // DASHBOARD DATA
  // =========================
  const [projects, setProjects] = useState(projectsData);
  const [reviews, setReviews] = useState(reviewsData);

  const [search, setSearch] = useState("");
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [darkMode, setDarkMode] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [month, setMonth] = useState("This month");
  const [message, setMessage] = useState("");

  // =========================
  // LOAD CURRENT USER
  // =========================
  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const data = await getCurrentUser(token);

        console.log("Authenticated user:", data);

        setUser(data);
      } catch (error) {
        console.error("Failed to load current user:", error);

        localStorage.removeItem("access_token");
        sessionStorage.removeItem("access_token");

        navigate("/login", { replace: true });
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [navigate]);

  // =========================
  // SEARCH PROJECTS
  // =========================
  const filteredProjects = useMemo(() => {
    if (!search.trim()) {
      return projects;
    }

    const value = search.toLowerCase();

    return projects.filter((project) =>
      project.name.toLowerCase().includes(value)
    );
  }, [projects, search]);

  // =========================
  // TOAST
  // =========================
  const notify = (text) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 2000);
  };

  // =========================
  // CREATE PROJECT
  // =========================
  const createProject = () => {
    const newProject = {
      id: Date.now(),
      name: "New Project",
      tags: ["JavaScript", "Web App"],
      progress: 0,
    };

    setProjects((current) => [newProject, ...current]);

    notify("New project created");
  };

  // =========================
  // REVIEW PROJECT
  // =========================
  const reviewProject = (id) => {
    setReviews((current) =>
      current.filter((review) => review.id !== id)
    );

    notify("Review completed");
  };

  // =========================
  // LOGOUT
  // =========================
  const logout = () => {
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");

    navigate("/login", { replace: true });
  };

  // =========================
  // LOADING
  // =========================
  if (loadingUser || !user) {
    return (
      <div style={{ padding: 40 }}>
        Loading dashboard...
      </div>
    );
  }

  // =========================
  // REAL USER DATA
  // =========================

  const userName = user.name || "User";
  const userEmail = user.email || "";

  const avatarLetter = userName
    .charAt(0)
    .toUpperCase();

  const providers =
    user.providers?.length
      ? user.providers.join(", ")
      : "local";

  const verificationText = user.is_verified
    ? "Verified"
    : "Not verified";

  return (
    <div
      className={`dashboard ${
        darkMode ? "dark" : "light"
      }`}
    >
      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">▣</div>

          <span>
            DocuAI<span className="red">.</span>
          </span>
        </div>

        <nav className="navigation">
          {[
            "Dashboard",
            "Projects",
            "Documentation",
            "History",
            "Settings",
          ].map((item) => (
            <button
              key={item}
              className={
                activeMenu === item
                  ? "nav-button active"
                  : "nav-button"
              }
              onClick={() => {
                setActiveMenu(item);

                if (item !== "Dashboard") {
                  notify(`${item} selected`);
                }
              }}
            >
              <span className="nav-icon">
                {item === "Dashboard" && "⌂"}
                {item === "Projects" && "▱"}
                {item === "Documentation" && "▤"}
                {item === "History" && "◷"}
                {item === "Settings" && "⚙"}
              </span>

              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* =========================
          MAIN
      ========================= */}

      <main className="main">

        {/* =========================
            TOP BAR
        ========================= */}

        <header className="topbar">

          <div className="search">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search repositories, projects..."
            />

            {!search && (
              <div className="shortcut">
                Ctrl K
              </div>
            )}
          </div>

          <div className="top-actions">

            {/* DARK MODE */}
            <button
              className="icon-button"
              onClick={() =>
                setDarkMode((value) => !value)
              }
            >
              {darkMode ? "☾" : "☀"}
            </button>

            {/* NOTIFICATIONS */}
            <div className="dropdown-wrapper">

              <button
                className="icon-button notification"
                onClick={() => {
                  setShowNotifications(
                    (value) => !value
                  );

                  setShowProfile(false);
                }}
              >
                ♧

                <span className="notification-dot" />
              </button>

              {showNotifications && (
                <div className="dropdown notification-box">

                  <h3>Notifications</h3>

                  <div className="notification-item">
                    <strong>
                      Documentation generated
                    </strong>

                    <p>
                      Student ERP is ready for review.
                    </p>
                  </div>

                  <div className="notification-item">
                    <strong>
                      Review required
                    </strong>

                    <p>
                      {reviews.length} items need your
                      attention.
                    </p>
                  </div>

                </div>
              )}
            </div>

            {/* PROFILE */}
            <div className="dropdown-wrapper">

              <button
                className="profile"
                onClick={() => {
                  setShowProfile(
                    (value) => !value
                  );

                  setShowNotifications(false);
                }}
              >
                <div className="avatar">
                  {avatarLetter}
                </div>

                <span>{userName}</span>

                <span>⌄</span>
              </button>

              {showProfile && (
                <div className="dropdown profile-box">

                  <strong>{userName}</strong>

                  <span>{userEmail}</span>

                  <span>
                    {verificationText}
                  </span>

                  <span>
                    Login: {providers}
                  </span>

                  <button
                    onClick={() =>
                      notify("Settings selected")
                    }
                  >
                    Settings
                  </button>

                  <button onClick={logout}>
                    Sign out
                  </button>

                </div>
              )}

            </div>

          </div>
        </header>

        {/* =========================
            CONTENT
        ========================= */}

        <div className="content">

          {/* HEADING */}

          <section className="heading">

            <div>

              <h1>
                Good Evening,{" "}
                <span>{userName}</span> 👋
              </h1>

              <p>
                Continue working on your documentation.
              </p>

            </div>

            <button
              className="new-project"
              onClick={createProject}
            >
              + New Project
            </button>

          </section>

          {/* =========================
              USER STATUS
          ========================= */}

          <section className="action-grid">

            <button
              className="action-card"
              onClick={() =>
                notify("GitHub import selected")
              }
            >

              <div className="action-symbol">
                GH
              </div>

              <div>
                <h3>Import Repository</h3>

                <p>
                  Connect your GitHub repo and generate
                  documentation.
                </p>
              </div>

              <span className="arrow">
                ›
              </span>

            </button>

            <button
              className="action-card"
              onClick={() =>
                notify("Upload project selected")
              }
            >

              <div className="action-symbol">
                ↑
              </div>

              <div>
                <h3>Upload Project</h3>

                <p>
                  Upload a ZIP folder from your computer.
                </p>
              </div>

              <span className="arrow">
                ›
              </span>

            </button>

          </section>

          {/* =========================
              TWO COLUMNS
          ========================= */}

          <section className="columns">

            {/* LEFT */}

            <div className="left">

              {/* RECENT PROJECTS */}

              <div className="panel">

                <div className="panel-header">

                  <h2>
                    Recent Projects
                  </h2>

                  <button
                    onClick={() =>
                      notify("Showing all projects")
                    }
                  >
                    View All →
                  </button>

                </div>

                <div className="project-list">

                  {filteredProjects.map(
                    (project) => (

                      <div
                        className="project"
                        key={project.id}
                      >

                        <div className="folder">
                          📁
                        </div>

                        <div className="project-name">

                          <h3>
                            {project.name}
                          </h3>

                          <div className="tags">

                            {project.tags.map(
                              (tag) => (
                                <span key={tag}>
                                  {tag}
                                </span>
                              )
                            )}

                          </div>

                        </div>

                        <div className="progress">

                          <div className="progress-bar">

                            <div
                              style={{
                                width: `${project.progress}%`,
                              }}
                            />

                          </div>

                          <span>
                            {project.progress}%
                          </span>

                        </div>

                        <button className="row-arrow">
                          ›
                        </button>

                        <button className="more">
                          ⋮
                        </button>

                      </div>

                    )
                  )}

                </div>

              </div>

              {/* REVIEW */}

              <div className="panel">

                <div className="panel-header">

                  <h2>
                    Review Required
                  </h2>

                  <button>
                    View All →
                  </button>

                </div>

                <div className="review-list">

                  {reviews.length === 0 ? (

                    <div className="empty">
                      ✓ All reviews completed
                    </div>

                  ) : (

                    reviews.map((review) => (

                      <div
                        className="review"
                        key={review.id}
                      >

                        <div className="review-icon">
                          ◇
                        </div>

                        <div className="review-info">

                          <h3>
                            {review.title}
                          </h3>

                          <p>
                            {review.description}
                          </p>

                        </div>

                        <button
                          className="review-button"
                          onClick={() =>
                            reviewProject(
                              review.id
                            )
                          }
                        >
                          Review
                        </button>

                        <button className="more">
                          ⋮
                        </button>

                      </div>

                    ))

                  )}

                </div>

              </div>

            </div>

            {/* RIGHT */}

            <div className="right">

              {/* OVERVIEW */}

              <div className="panel">

                <div className="panel-header">

                  <h2>
                    Documentation Overview
                  </h2>

                  <select
                    value={month}
                    onChange={(event) =>
                      setMonth(event.target.value)
                    }
                  >
                    <option>
                      This month
                    </option>

                    <option>
                      Last month
                    </option>

                    <option>
                      Last 3 months
                    </option>

                    <option>
                      This year
                    </option>

                  </select>

                </div>

                <div className="stats">

                  <div className="stat">

                    <div className="stat-symbol blue">
                      ▤
                    </div>

                    <strong>
                      42
                    </strong>

                    <span>
                      Docstrings
                    </span>

                  </div>

                  <div className="stat">

                    <div className="stat-symbol green">
                      ◌
                    </div>

                    <strong>
                      16
                    </strong>

                    <span>
                      Inline Comments
                    </span>

                  </div>

                  <div className="stat">

                    <div className="stat-symbol blue">
                      ▣
                    </div>

                    <strong>
                      1
                    </strong>

                    <span>
                      README
                    </span>

                  </div>

                  <div className="stat">

                    <div className="stat-symbol yellow">
                      ✓
                    </div>

                    <strong>
                      {reviews.length}
                    </strong>

                    <span>
                      Reviews
                    </span>

                  </div>

                </div>

              </div>

              {/* CHART */}

              <div className="panel chart-panel">

                <div className="panel-header">

                  <h2>
                    Documentation by File Type
                  </h2>

                </div>

                <div className="chart">

                  <div className="donut">

                    <div className="donut-center">

                      <strong>
                        71%
                      </strong>

                      <span>
                        Documented
                      </span>

                    </div>

                  </div>

                  <div className="legend">

                    <div>
                      <i className="blue" />

                      <span>
                        Functions
                      </span>

                      <strong>
                        42
                      </strong>
                    </div>

                    <div>
                      <i className="green" />

                      <span>
                        Classes
                      </span>

                      <strong>
                        18
                      </strong>
                    </div>

                    <div>
                      <i className="yellow" />

                      <span>
                        Modules
                      </span>

                      <strong>
                        6
                      </strong>
                    </div>

                    <div>
                      <i className="red" />

                      <span>
                        Others
                      </span>

                      <strong>
                        8
                      </strong>
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </section>

          {/* =========================
              TIPS
          ========================= */}

          <section className="panel tips-panel">

            <div className="panel-header">

              <h2>
                💡 Tips for Better Documentation
              </h2>

              <button>
                View All →
              </button>

            </div>

            <div className="tips">

              <div className="tip">

                <div className="tip-icon">
                  &lt;/&gt;
                </div>

                <div>

                  <h3>
                    Add meaningful docstrings
                  </h3>

                  <p>
                    Explain what each function does
                    and its parameters.
                  </p>

                </div>

                <span>
                  →
                </span>

              </div>

              <div className="tip">

                <div className="tip-icon">
                  💬
                </div>

                <div>

                  <h3>
                    Explain complex logic
                  </h3>

                  <p>
                    Use inline comments for
                    non-trivial code.
                  </p>

                </div>

                <span>
                  →
                </span>

              </div>

              <div className="tip">

                <div className="tip-icon green">
                  ▤
                </div>

                <div>

                  <h3>
                    Keep README updated
                  </h3>

                  <p>
                    Include setup steps, usage
                    and examples.
                  </p>

                </div>

                <span>
                  →
                </span>

              </div>

            </div>

          </section>

        </div>

      </main>

      {/* =========================
          TOAST
      ========================= */}

      {message && (
        <div className="toast">
          ✓ {message}
        </div>
      )}

    </div>
  );
}

export default Dashboard;