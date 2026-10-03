import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../api/auth";
import {getProjects, createProject as createProjectApi, deleteProject} from "../../api/projects";
import { getDocumentationRuns } from "../../api/dashboard";
import AppTopBar from "../common/AppTopBar.jsx";
import ActionCards from "./components/ActionCards";
import RecentProjects from "./components/RecentProjects";
import ReviewRequired from "./components/ReviewRequired";
import DocumentationOverview from "./components/DocumentationOverview";
import DocumentationChart from "./components/DocumentationChart";
import Tips from "./components/Tips";
import Toast from "./components/Toast";

const reviewsData = [
  { id: 1, title: "Update API endpoints", description: "3 changes • 2 comments" },
  { id: 2, title: "Student ERP", description: "7 docstrings • 3 comments • 1 README" },
  { id: 3, title: "Fix authentication flow", description: "5 changes • 4 comments" },
];

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

function getGitHubMessage() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const githubError =
    params.get(
      "github_error"
    );

  if (githubError) {
    return githubError;
  }

  if (
    params.get("github") ===
    "connected"
  ) {
    return "GitHub connected successfully";
  }

  return "";
}

function filterRunsByPeriod(runs, period) {
  const now = new Date();

  return runs.filter((run) => {
    if (!run.created_at) {
      return false;
    }

    const runDate = new Date(run.created_at);

    if (Number.isNaN(runDate.getTime())) {
      return false;
    }

    if (period === "This month") {
      return (
        runDate.getFullYear() === now.getFullYear() &&
        runDate.getMonth() === now.getMonth()
      );
    }

    if (period === "Last month") {
      const lastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      return (
        runDate.getFullYear() === lastMonth.getFullYear() &&
        runDate.getMonth() === lastMonth.getMonth()
      );
    }

    if (period === "Last 3 months") {
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        1
      );

      return runDate >= startDate && runDate <= now;
    }

    if (period === "This year") {
      return runDate.getFullYear() === now.getFullYear();
    }

    return true;
  });
}

export default function Dashboard() {

  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [loadingUser, setLoadingUser] = useState(true);

  const [projects, setProjects] = useState([]);

  const [loadingProjects, setLoadingProjects] = useState(true);

  const [reviews, setReviews] = useState(reviewsData);

  const [search, setSearch] = useState("");

  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const [darkMode, setDarkMode] = useState(true);

  const [showProfile, setShowProfile] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);

  const [month, setMonth] = useState("This month");

  const [message, setMessage] = useState(getGitHubMessage);


  // for the documentation overview

    const [documentationRuns, setDocumentationRuns] = useState([]);

    const [documentationData, setDocumentationData] = useState({
      docstrings: 0,
      comments: 0,
      readme: 0,
      reviews: 0,
    });

    const [documentationLoading, setDocumentationLoading] = useState(true);


    //  handle clicks of the recent project

    const handleViewDocumentation = (project) => {
      const jobId = project?.latest_job_id;
      navigate(`/docpilot?projectId=${encodeURIComponent(project.id)}${jobId ? `&jobId=${encodeURIComponent(jobId)}` : ""}`);
    };

    const handleGenerateDocumentation = (project) => {
      navigate(`/docpilot?projectId=${encodeURIComponent(project.id)}&start=true`);
    };

    const handleProjectSettings = (project) => {
      navigate(`/projects/${project.id}/settings`);
    };

    const handleDeleteProject = async (projectOrId) => {
      try {
        const projectId =
          typeof projectOrId === "object"
            ? projectOrId?.id
            : projectOrId;

        if (!projectId) {
          console.error("Cannot delete project: missing project ID", projectOrId);
          return;
        }

        console.log("Deleting project:", projectId);

        const  token = getToken();

        await deleteProject(token ,projectId);

        setProjects((currentProjects) =>
          currentProjects.filter(
            (project) => project.id !== projectId
          )
        );
      } catch (error) {
        console.error("Failed to delete project:", error);
      }
    };

  useEffect(() => {
  const fetchDocumentationRuns = async () => {
    try {
      setDocumentationLoading(true);

      const runs = await getDocumentationRuns();

      setDocumentationRuns(runs);
    } catch (error) {
      console.error(
        "Failed to fetch documentation runs:",
        error
      );

      setDocumentationRuns([]);
    } finally {
      setDocumentationLoading(false);
    }
  };

  fetchDocumentationRuns();
}, []);

  useEffect(() => {
  const filteredRuns = filterRunsByPeriod(
    documentationRuns,
    month
  );

  const totals = filteredRuns.reduce(
    (acc, run) => ({
      docstrings:
        acc.docstrings + (run.docstrings_count ?? 0),

      comments:
        acc.comments + (run.comments_count ?? 0),

      readme:
        acc.readme + (run.readme_count ?? 0),

      reviews: acc.reviews,
    }),
    {
      docstrings: 0,
      comments: 0,
      readme: 0,
      reviews: 0,
    }
  );

  setDocumentationData(totals);

  }, [documentationRuns, month]);

  /* =========================================================
     LOAD PROJECTS FROM BACKEND
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      const token = getToken();

      if (!token) {
        if (!cancelled) {
          setProjects([]);
          setLoadingProjects(false);
        }
        return;
      }

      try {
        const result = await getProjects(token);

        if (cancelled) return;

        const mappedProjects = (result.projects || []).map((project) => ({
          ...project,
          tags: project.language
            ? [project.language]
            : project.source_type === "github"
              ? ["GitHub"]
              : project.source_type === "upload"
                ? ["Local Project"]
                : ["Project"],
          progress: Number.isFinite(project.documentation_progress)
            ? project.documentation_progress
            : 0,
        }));

        setProjects(mappedProjects);
      } catch (error) {
        console.error("Could not load projects:", error);

        if (!cancelled) {
          setProjects([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    };

    const refreshProjects = () => {
      loadProjects();
    };

    loadProjects();

    window.addEventListener("docuai-projects-updated", refreshProjects);

    return () => {
      cancelled = true;
      window.removeEventListener("docuai-projects-updated", refreshProjects);
    };
  }, []);

  /* =========================================================
     LOAD CURRENT USER
     ========================================================= */

  useEffect(() => {
    const loadUser = async () => {
      const token = getToken();

      if (!token) {
        navigate(
          "/login",
          { replace: true }
        );
        return;
      }

      try {
        const data =
          await getCurrentUser(
            token
          );

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

        navigate(
          "/login",
          { replace: true }
        );
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [navigate]);

  /* =========================================================
     REMOVE GITHUB QUERY PARAMETERS
     ========================================================= */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.has(
        "github_error"
      ) ||
      params.has("github")
    ) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, []);

  /* =========================================================
     FILTER PROJECTS
     ========================================================= */

  const filteredProjects =
    useMemo(() => {
      if (!search.trim()) {
        return projects;
      }

      const value =
        search.toLowerCase();

      return projects.filter(
        (project) =>
          project.name
            .toLowerCase()
            .includes(value)
      );
    }, [
      projects,
      search,
    ]);

  /* =========================================================
     CREATE PROJECT
     ========================================================= */

  const createProject = async () => {
    const token = getToken();

    if (!token) {
      notify("Please login first");
      navigate("/login", { replace: true });
      return;
    }

    try {
      const saved = await createProjectApi(token, {
        name: "New Project",
        description: "",
        source_type: "manual",
        github_owner: null,
        github_repo: null,
        github_url: null,
        local_storage_path: null,
        language: "JavaScript",
        status: "created",
        documentation_progress: 0,
      });

      const mapped = {
        ...saved,
        tags: saved.language ? [saved.language] : ["Project"],
        progress: saved.documentation_progress || 0,
      };

      setProjects((current) => [mapped, ...current.filter((project) => project.id !== saved.id)]);
      notify("New project created");
    } catch (error) {
      console.error("Could not create project:", error);
      notify(
        error.response?.data?.detail ||
          "Could not create project"
      );
    }
  };

  /* =========================================================
     REVIEW PROJECT
     ========================================================= */

  const reviewProject = (
    id
  ) => {
    setReviews(
      (current) =>
        current.filter(
          (review) =>
            review.id !== id
        )
    );

    notify(
      "Review completed"
    );
  };

  /* =========================================================
     LOGOUT
     ========================================================= */

  const logout = () => {
    localStorage.removeItem(
      "access_token"
    );

    sessionStorage.removeItem(
      "access_token"
    );

    navigate(
      "/login",
      { replace: true }
    );
  };

  /* =========================================================
     SIDEBAR
     ========================================================= */

  const selectMenu = (
    item
  ) => {
    setActiveMenu(item);

    if (
      item !==
      "Dashboard"
    ) {
      notify(
        `${item} selected`
      );
    }
  };

  /* =========================================================
     TOAST
     ========================================================= */

  const notify = (
    text
  ) => {
    setMessage(text);
  };

  /* =========================================================
     LOADING
     ========================================================= */

  if (
    loadingUser ||
    !user
  ) {
    return (
      <div className="min-h-screen bg-[#0d0f10] p-10 text-[#f2f3f4]">
        Loading dashboard...
        <Toast
          message={message}
          darkMode={
            darkMode
          }
        />
      </div>
    );
  }

  /* =========================================================
     USER
     ========================================================= */

  const userName =
    user.name || "User";

  const userEmail =
    user.email || "";

  const avatarLetter =
    userName
      .charAt(0)
      .toUpperCase();

  const providers =
    user.providers?.length
      ? user.providers.join(
          ", "
        )
      : "local";

  const verificationText =
    user.is_verified
      ? "Verified"
      : "Not verified";

  /* =========================================================
     THEME
     ========================================================= */

  const page =
    darkMode
      ? "bg-[#0d0f10] text-[#f2f3f4]"
      : "bg-[#f4f5f6] text-[#17191c]";

  return (
    <div
      className={`
        min-h-screen
        w-full
        font-[Inter,-apple-system,BlinkMacSystemFont,"Segoe_UI",Arial,sans-serif]
        ${page}
      `}
    >


      <main
        className="min-h-screen w-full"
      >
        <AppTopBar
          search={search}
          setSearch={
            setSearch
          }
          darkMode={
            darkMode
          }
          setDarkMode={
            setDarkMode
          }
          showNotifications={
            showNotifications
          }
          setShowNotifications={
            setShowNotifications
          }
          showProfile={
            showProfile
          }
          setShowProfile={
            setShowProfile
          }
          userName={
            userName
          }
          avatarLetter={
            avatarLetter
          }
          userEmail={
            userEmail
          }
          verificationText={
            verificationText
          }
          providers={
            providers
          }
          reviewsCount={
            reviews.length
          }
          onNotify={
            notify
          }
          onLogout={
            logout
          }
        />

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
              onClick={
                createProject
              }
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

          <ActionCards
            darkMode={
              darkMode
            }
          />

          <section
            className="
              grid
              grid-cols-[1.55fr_1fr]
              gap-[22px]
              max-[1100px]:grid-cols-1
            "
          >
            <div className="flex flex-col gap-[17px]">
              <RecentProjects
                projects={filteredProjects.slice(0, 3)}
                darkMode={darkMode}
                loading={loadingProjects}
                onOpenProject={(project) => {
                  if (project.source_type === "github" && project.github_owner && project.github_repo) {
                    navigate(
                      `/repository/${encodeURIComponent(project.github_owner)}/${encodeURIComponent(project.github_repo)}`
                    );
                    return;
                  }

                  navigate(
                    `/repository/uploaded/${encodeURIComponent(project.id)}`,
                    {
                      state: {
                        source: "saved-upload",
                        projectId: project.id,
                        projectName: project.name,
                        project,
                      },
                    }
                  );
                }}
                onViewAll={() => navigate("/projects")}
                onViewDocumentation={handleViewDocumentation}
                onGenerateDocumentation={handleGenerateDocumentation}
                onProjectSettings={handleProjectSettings}
                onDeleteProject={handleDeleteProject}

              />

              <ReviewRequired
                reviews={
                  reviews
                }
                darkMode={
                  darkMode
                }
                onReview={
                  reviewProject
                }
                onViewAll={() =>
                  notify(
                    "Showing all reviews"
                  )
                }
              />
            </div>

            <div className="flex flex-col gap-[17px]">
                  <DocumentationOverview
                    month={month}
                    setMonth={setMonth}
                    data={documentationData}
                    loading={documentationLoading}
                    darkMode={darkMode}
                  />

                 <DocumentationChart
                  data={documentationData}
                  darkMode={darkMode}
                />
            </div>
          </section>

          <Tips
            darkMode={
              darkMode
            }
            onViewAll={() =>
              notify(
                "Showing all tips"
              )
            }
          />
        </div>
      </main>

      <Toast
        message={
          message
        }
        darkMode={
          darkMode
        }
      />
    </div>
  );
}

