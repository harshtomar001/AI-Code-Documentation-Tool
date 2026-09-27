import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Moon,
  Sun,
  Bell,
  ChevronDown,
  ChevronRight,
  Home,
  Folder,
  FileText,
  History,
  Settings,
  Github,
  Upload,
  Plus,
  Code2,
  MessageSquare,
  FileCode2,
  ClipboardCheck,
  Lightbulb,
  ArrowRight,
  X,
  CheckCircle2,
  Menu,
  MoreVertical,
  Sparkles,
} from "lucide-react";

import "./dash.css";

/* =========================================================
   SAMPLE DATA
========================================================= */

const initialProjects = [
  {
    id: 1,
    name: "Student ERP",
    languages: ["Python", "Web App"],
    progress: 68,
    color: "blue",
  },
  {
    id: 2,
    name: "Weather API",
    languages: ["JavaScript", "API"],
    progress: 42,
    color: "yellow",
  },
  {
    id: 3,
    name: "Portfolio",
    languages: ["HTML", "CSS", "JavaScript"],
    progress: 100,
    color: "green",
  },
];

const initialReviews = [
  {
    id: 1,
    title: "Update API endpoints",
    subtitle: "3 changes • 2 comments",
    type: "file",
    color: "orange",
  },
  {
    id: 2,
    title: "Student ERP",
    subtitle: "7 docstrings • 3 comments • 1 README",
    type: "folder",
    color: "purple",
  },
  {
    id: 3,
    title: "Fix authentication flow",
    subtitle: "5 changes • 4 comments",
    type: "code",
    color: "blue",
  },
];

const tips = [
  {
    id: 1,
    title: "Add meaningful docstrings",
    description: "Explain what each function does and its parameters.",
    icon: Code2,
    color: "blue",
  },
  {
    id: 2,
    title: "Explain complex logic",
    description: "Use inline comments for non-trivial code.",
    icon: MessageSquare,
    color: "blue",
  },
  {
    id: 3,
    title: "Keep README updated",
    description: "Include setup steps, usage and examples.",
    icon: FileText,
    color: "green",
  },
];

/* =========================================================
   COMPONENT
========================================================= */

function Dashboard() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [projects, setProjects] = useState(initialProjects);

  const [reviews, setReviews] = useState(initialReviews);

  const [search, setSearch] = useState("");

  const [month, setMonth] = useState("This month");

  const [darkMode, setDarkMode] = useState(true);

  const [showProfile, setShowProfile] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);

  const [mobileSidebar, setMobileSidebar] = useState(false);

  const [reviewedItems, setReviewedItems] = useState([]);

  const [toast, setToast] = useState("");

  /* =======================================================
     KEYBOARD SEARCH
  ======================================================= */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();

        const input = document.getElementById("dashboard-search");

        if (input) {
          input.focus();
        }
      }

      if (event.key === "Escape") {
        setShowProfile(false);
        setShowNotifications(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(query) ||
        project.languages.some((language) =>
          language.toLowerCase().includes(query)
        )
      );
    });
  }, [search, projects]);

  /* =======================================================
     REVIEW
  ======================================================= */

  const handleReview = (review) => {
    setReviewedItems((previous) => {
      if (previous.includes(review.id)) {
        return previous;
      }

      return [...previous, review.id];
    });

    setToast(`${review.title} marked as reviewed`);

    setTimeout(() => {
      setToast("");
    }, 2500);
  };

  /* =======================================================
     NEW PROJECT
  ======================================================= */

  const createProject = () => {
    const newProject = {
      id: Date.now(),
      name: "New Project",
      languages: ["JavaScript", "Web App"],
      progress: 0,
      color: "blue",
    };

    setProjects((previous) => [newProject, ...previous]);

    setToast("New project created");

    setTimeout(() => {
      setToast("");
    }, 2500);
  };

  /* =======================================================
     IMPORT
  ======================================================= */

  const handleImport = () => {
    setToast("GitHub repository import opened");

    setTimeout(() => {
      setToast("");
    }, 2500);
  };

  /* =======================================================
     UPLOAD
  ======================================================= */

  const handleUpload = () => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".zip";

    input.onchange = (event) => {
      const file = event.target.files?.[0];

      if (!file) return;

      setToast(`${file.name} selected`);
      
      setTimeout(() => {
        setToast("");
      }, 3000);
    };

    input.click();
  };

  /* =======================================================
     STATS
  ======================================================= */

  const stats = {
    docstrings: 42,
    comments: 16,
    readme: 1,
    reviews: Math.max(0, 12 - reviewedItems.length),
  };

  const totalDocumented =
    stats.docstrings + stats.comments + stats.readme;

  const documentedPercentage = 71;

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigation = [
    {
      name: "Dashboard",
      icon: Home,
    },
    {
      name: "Projects",
      icon: Folder,
    },
    {
      name: "Documentation",
      icon: FileText,
    },
    {
      name: "History",
      icon: History,
    },
    {
      name: "Settings",
      icon: Settings,
    },
  ];

  return (
    <div className={`dashboard ${darkMode ? "dark" : "light"}`}>
      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      {mobileSidebar && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`sidebar ${
          mobileSidebar ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-document-icon">
            <FileText size={29} strokeWidth={1.9} />
          </div>

          <span className="brand-name">
            DocuAI<span>.</span>
          </span>
        </div>

        <nav className="sidebar-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`sidebar-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.name);
                  setMobileSidebar(false);
                }}
              >
                <Icon size={24} strokeWidth={1.8} />

                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="main-content">
        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileSidebar(true)}
          >
            <Menu size={23} />
          </button>

          <div className="search-container">
            <Search size={21} />

            <input
              id="dashboard-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search repositories, projects..."
            />

            <div className="keyboard-shortcut">
              <span>Ctrl</span>
              <span>K</span>
            </div>

            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="topbar-actions">
            {/* Theme */}
            <button
              className="topbar-icon-button"
              onClick={() => setDarkMode((previous) => !previous)}
            >
              {darkMode ? (
                <Moon size={21} />
              ) : (
                <Sun size={21} />
              )}
            </button>

            {/* Notification */}
            <div className="dropdown-wrapper">
              <button
                className="topbar-icon-button notification-button"
                onClick={() =>
                  setShowNotifications((previous) => !previous)
                }
              >
                <Bell size={22} />

                <span className="notification-dot" />
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="dropdown-header">
                    <strong>Notifications</strong>

                    <span>3 new</span>
                  </div>

                  <div className="notification-item">
                    <div className="notification-symbol blue">
                      <Code2 size={17} />
                    </div>

                    <div>
                      <strong>Documentation generated</strong>
                      <p>Student ERP is ready for review.</p>
                    </div>
                  </div>

                  <div className="notification-item">
                    <div className="notification-symbol orange">
                      <ClipboardCheck size={17} />
                    </div>

                    <div>
                      <strong>Review required</strong>
                      <p>3 changes need your attention.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="dropdown-wrapper">
              <button
                className="profile-button"
                onClick={() =>
                  setShowProfile((previous) => !previous)
                }
              >
                <div className="avatar">A</div>

                <span className="profile-name">Aayushi</span>

                <ChevronDown size={17} />
              </button>

              {showProfile && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-user">
                    <div className="avatar large">A</div>

                    <div>
                      <strong>Aayushi</strong>
                      <span>aayushi@example.com</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActivePage("Settings");
                      setShowProfile(false);
                    }}
                  >
                    <Settings size={17} />
                    Settings
                  </button>

                  <button
                    onClick={() => {
                      setToast("Signed out");
                      setShowProfile(false);

                      setTimeout(() => {
                        setToast("");
                      }, 2500);
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="content">
          {/* ===============================================
              PAGE HEADING
          =============================================== */}

          <section className="page-heading">
            <div>
              <h1>
                Good Evening,{" "}
                <span>Aayushi</span> 👋
              </h1>

              <p>Continue working on your documentation.</p>
            </div>

            <button
              className="new-project-button"
              onClick={createProject}
            >
              <Plus size={21} />

              <span>New Project</span>
            </button>
          </section>

          {/* ===============================================
              ACTION CARDS
          =============================================== */}

          <section className="action-grid">
            <button
              className="action-card"
              onClick={handleImport}
            >
              <div className="action-icon github">
                <Github size={37} />
              </div>

              <div className="action-content">
                <h3>Import Repository</h3>

                <p>
                  Connect your GitHub repo and generate
                  documentation.
                </p>
              </div>

              <ChevronRight
                className="action-arrow"
                size={25}
              />
            </button>

            <button
              className="action-card"
              onClick={handleUpload}
            >
              <div className="action-icon upload">
                <Upload size={38} />
              </div>

              <div className="action-content">
                <h3>Upload Project</h3>

                <p>
                  Upload a ZIP folder from your computer.
                </p>
              </div>

              <ChevronRight
                className="action-arrow"
                size={25}
              />
            </button>
          </section>

          {/* ===============================================
              DASHBOARD GRID
          =============================================== */}

          <section className="dashboard-grid">
            {/* =============================================
                LEFT COLUMN
            ============================================= */}

            <div className="left-column">
              {/* Recent Projects */}
              <section className="panel recent-projects">
                <div className="panel-header">
                  <h2>Recent Projects</h2>

                  <button
                    onClick={() => setActivePage("Projects")}
                  >
                    View All
                    <ArrowRight size={17} />
                  </button>
                </div>

                <div className="projects-list">
                  {filteredProjects.length === 0 ? (
                    <div className="empty-state">
                      <Search size={30} />
                      <p>No projects found.</p>
                    </div>
                  ) : (
                    filteredProjects.map((project) => (
                      <div
                        className="project-row"
                        key={project.id}
                      >
                        <div className="project-folder">
                          <Folder size={28} />
                        </div>

                        <div className="project-details">
                          <h3>{project.name}</h3>

                          <div className="project-tags">
                            {project.languages.map(
                              (language) => (
                                <span key={language}>
                                  {language}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div className="project-progress">
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${project.color}`}
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
                          <ChevronRight size={23} />
                        </button>

                        <button className="more-button">
                          <MoreVertical size={19} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Review Required */}
              <section className="panel review-panel">
                <div className="panel-header">
                  <h2>Review Required</h2>

                  <button>
                    View All
                    <ArrowRight size={17} />
                  </button>
                </div>

                <div className="review-list">
                  {reviews.map((review) => {
                    const reviewed = reviewedItems.includes(
                      review.id
                    );

                    return (
                      <div
                        className={`review-row ${
                          reviewed ? "reviewed" : ""
                        }`}
                        key={review.id}
                      >
                        <div
                          className={`review-icon ${review.color}`}
                        >
                          {review.type === "file" && (
                            <FileText size={24} />
                          )}

                          {review.type === "folder" && (
                            <Folder size={24} />
                          )}

                          {review.type === "code" && (
                            <Code2 size={24} />
                          )}
                        </div>

                        <div className="review-details">
                          <h3>{review.title}</h3>
                          <p>{review.subtitle}</p>
                        </div>

                        <button
                          className={`review-button ${
                            reviewed ? "completed" : ""
                          }`}
                          onClick={() =>
                            handleReview(review)
                          }
                        >
                          {reviewed ? (
                            <>
                              <CheckCircle2 size={15} />
                              Reviewed
                            </>
                          ) : (
                            "Review"
                          )}
                        </button>

                        <button className="more-button">
                          <MoreVertical size={19} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* =============================================
                RIGHT COLUMN
            ============================================= */}

            <div className="right-column">
              {/* Documentation Overview */}
              <section className="panel overview-panel">
                <div className="panel-header">
                  <h2>Documentation Overview</h2>

                  <select
                    value={month}
                    onChange={(event) =>
                      setMonth(event.target.value)
                    }
                  >
                    <option>This month</option>
                    <option>Last month</option>
                    <option>Last 3 months</option>
                    <option>This year</option>
                  </select>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon blue">
                      <FileText size={23} />
                    </div>

                    <strong>{stats.docstrings}</strong>

                    <span>Docstrings</span>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon green">
                      <MessageSquare size={23} />
                    </div>

                    <strong>{stats.comments}</strong>

                    <span>Inline Comments</span>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon blue">
                      <FileCode2 size={23} />
                    </div>

                    <strong>{stats.readme}</strong>

                    <span>README</span>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon yellow">
                      <ClipboardCheck size={23} />
                    </div>

                    <strong>{stats.reviews}</strong>

                    <span>Reviews</span>
                  </div>
                </div>
              </section>

              {/* Documentation By File Type */}
              <section className="panel chart-panel">
                <div className="panel-header">
                  <h2>Documentation by File Type</h2>
                </div>

                <div className="chart-content">
                  <div
                    className="donut-chart"
                    style={{
                      "--percentage": `${documentedPercentage}%`,
                    }}
                  >
                    <div className="donut-inner">
                      <strong>
                        {documentedPercentage}%
                      </strong>

                      <span>Documented</span>
                    </div>
                  </div>

                  <div className="chart-legend">
                    <div>
                      <span className="legend-dot blue" />
                      <span>Functions</span>
                      <strong>42</strong>
                    </div>

                    <div>
                      <span className="legend-dot green" />
                      <span>Classes</span>
                      <strong>18</strong>
                    </div>

                    <div>
                      <span className="legend-dot yellow" />
                      <span>Modules</span>
                      <strong>6</strong>
                    </div>

                    <div>
                      <span className="legend-dot red" />
                      <span>Others</span>
                      <strong>8</strong>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </section>

          {/* ===============================================
              TIPS
          =============================================== */}

          <section className="panel tips-panel">
            <div className="panel-header">
              <h2>
                <Lightbulb size={22} />
                Tips for Better Documentation
              </h2>

              <button>
                View All
                <ArrowRight size={17} />
              </button>
            </div>

            <div className="tips-grid">
              {tips.map((tip) => {
                const Icon = tip.icon;

                return (
                  <button
                    className="tip-card"
                    key={tip.id}
                  >
                    <div
                      className={`tip-icon ${tip.color}`}
                    >
                      <Icon size={23} />
                    </div>

                    <div className="tip-content">
                      <h3>{tip.title}</h3>

                      <p>{tip.description}</p>
                    </div>

                    <ArrowRight
                      className="tip-arrow"
                      size={19}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* ===================================================
          TOAST
      =================================================== */}

      {toast && (
        <div className="toast">
          <CheckCircle2 size={19} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

export default Dashboard;