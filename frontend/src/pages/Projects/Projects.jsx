import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
// import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ProjectsHeader from "./components/ProjectsHeader";
import ProjectToolbar from "./components/ProjectToolbar";
import ProjectGrid from "./components/ProjectGrid";
import NewProjectModal from "./components/NewProjectModal";
import EmptyState from "./components/EmptyState";
import "./projects.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

const PROJECT_FILTERS = [
  "All",
  "In Progress",
  "Completed",
  "Needs Review",
];

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

function normalizeProject(project) {
  const progress = Number(
    project.documentation_progress ??
      project.progress ??
      0
  );

  const sourceType =
    project.source_type ||
    project.source ||
    "Project";

  const tags = Array.isArray(project.tags)
    ? project.tags
    : project.language
      ? [project.language]
      : sourceType === "github"
        ? ["GitHub"]
        : ["Project"];

  return {
    ...project,
    id: project.id,
    name: project.name || "Untitled Project",
    description:
      project.description ||
      "No project description added yet.",
    tags,
    progress: Number.isFinite(progress)
      ? Math.max(0, Math.min(100, progress))
      : 0,
    docs: Number(project.docs ?? project.documentation_count ?? 0) || 0,
    comments: Number(project.comments ?? 0) || 0,
    updatedAt:
      project.updated_at ||
      project.updatedAt ||
      project.created_at ||
      null,
    updated:
      project.updated ||
      formatUpdated(project.updated_at || project.created_at),
    source_type: sourceType,
    status:
      project.status ||
      (progress >= 100 ? "Completed" : "In Progress"),
    color: getProjectColor(sourceType, project.id),
  };
}

function formatUpdated(value) {
  if (!value) return "Updated recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated recently";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes < 60) return `Updated ${diffMinutes} min ago`;

  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Updated ${days} day${days > 1 ? "s" : ""} ago`;

  return `Updated ${days} days ago`;
}

function getProjectColor(sourceType, id) {
  if (sourceType === "github") return "blue";
  if (sourceType === "upload") return "yellow";

  const colors = ["coral", "green", "slate", "red", "gray"];
  const numericId = Number(id);
  return colors[
    Number.isFinite(numericId)
      ? Math.abs(numericId) % colors.length
      : 0
  ];
}

async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = "Request failed";

    try {
      const data = await response.json();
      detail = data?.detail || detail;
    } catch {
      // Keep the generic error when the API does not return JSON.
    }

    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

function extractProjects(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export default function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Last updated");
  const [view, setView] = useState("grid");
  const [menuId, setMenuId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [user, setUser] = useState(null);
  const [themeDark, setThemeDark] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const token = getToken();

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await request("/api/projects");
        if (!cancelled) {
          setProjects(extractProjects(data).map(normalizeProject));
        }
      } catch (err) {
        console.error("Projects load error:", err);
        if (!cancelled) {
          setError(err.message || "Could not load projects.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const data = await request("/api/auth/me");
        if (!cancelled) setUser(data);
      } catch (err) {
        console.warn("Could not load current user:", err);
      }
    };

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = projects.filter((project) => {
      const matchesFilter =
        filter === "All" || project.status === filter;

      const text = [
        project.name,
        project.description,
        ...(project.tags || []),
        project.source_type,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesFilter &&
        (!query || text.includes(query))
      );
    });

    if (sort === "Name") {
      return [...result].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    if (sort === "Progress") {
      return [...result].sort(
        (a, b) => b.progress - a.progress
      );
    }

    return [...result].sort((a, b) => {
      const aDate = a.updatedAt
        ? new Date(a.updatedAt).getTime()
        : 0;
      const bDate = b.updatedAt
        ? new Date(b.updatedAt).getTime()
        : 0;
      return bDate - aDate;
    });
  }, [projects, filter, search, sort]);

  const openProject = (project) => {
  setMenuId(null);

  if (project.github_owner && project.github_repo) {
    navigate(
      `/repository/${encodeURIComponent(
        project.github_owner
      )}/${encodeURIComponent(
        project.github_repo
      )}`
    );
    return;
  }

  navigate(`/repository/uploaded/${encodeURIComponent(project.id)}`, {
    state: {
      projectId: project.id,
      project,
      source: project.source_type,
    },
  });
};

  const createProject = async (payload) => {
    try {
      const projectPayload =
        typeof payload === "string"
          ? {
              name: payload,
              description:
                "New documentation project.",
              source_type: "manual",
            }
          : payload;

      const data = await request("/api/projects", {
        method: "POST",
        body: JSON.stringify(projectPayload),
      });

      const created = normalizeProject(
        data?.project || data
      );

      setProjects((current) => [created, ...current]);
      setShowModal(false);
      setMenuId(null);
      openProject(created);
    } catch (err) {
      console.error("Create project error:", err);
      setError(err.message || "Could not create project.");
    }
  };

  const duplicateProject = async (project) => {
    try {
      const payload = {
        name: `${project.name} Copy`,
        description: project.description,
        source_type: project.source_type || "manual",
        github_owner: project.github_owner || null,
        github_repo: project.github_repo || null,
        github_url: project.github_url || null,
        language: project.language || project.tags?.[0] || null,
        status: project.status,
        documentation_progress: project.progress,
      };

      const data = await request("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const duplicated = normalizeProject(
        data?.project || data
      );

      setProjects((current) => [
        duplicated,
        ...current,
      ]);
      setMenuId(null);
    } catch (err) {
      console.error("Duplicate project error:", err);
      setError(err.message || "Could not duplicate project.");
    }
  };

  const deleteProject = async (id) => {
    try {
      await request(`/api/projects/${id}`, {
        method: "DELETE",
      });

      setProjects((current) =>
        current.filter((project) => project.id !== id)
      );
      setMenuId(null);
    } catch (err) {
      console.error("Delete project error:", err);
      setError(err.message || "Could not delete project.");
    }
  };

 

const userName = user?.name || "User";
const avatarLetter = userName.charAt(0).toUpperCase();

return (
  <div
    className={`min-h-screen w-full ${
      themeDark
        ? "bg-[#0d0f10] text-[#f2f3f4]"
        : "bg-[#f4f5f6] text-[#17191c]"
    }`}
  >
    <div className="w-full">
      <Topbar
        search={globalSearch}
        setSearch={setGlobalSearch}
        darkMode={themeDark}
        setDarkMode={setThemeDark}
        userName={userName}
        avatarLetter={avatarLetter}
        userEmail={user?.email || ""}
        verificationText={
          user?.is_verified
            ? "Verified"
            : "Not verified"
        }
        providers={
          user?.providers?.length
            ? user.providers.join(", ")
            : "local"
        }
        showNotifications={false}
        setShowNotifications={() => {}}
        showProfile={false}
        setShowProfile={() => {}}
        reviewsCount={0}
        onNotify={() => {}}
        onLogout={() => {
          localStorage.removeItem("access_token");
          sessionStorage.removeItem("access_token");
          navigate("/login", { replace: true });
        }}
      />

      <section className="page-content">
        <ProjectsHeader
          onNewProject={() => setShowModal(true)}
        />

        <ProjectToolbar
          filters={PROJECT_FILTERS}
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          sort={sort}
          setSort={setSort}
          view={view}
          setView={setView}
        />

        {error && (
          <div
            className="projects-error"
            role="alert"
          >
            <span>{error}</span>

            <button
              onClick={() =>
                window.location.reload()
              }
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="projects-loading">
            Loading projects...
          </div>
        ) : filteredProjects.length ? (
          <ProjectGrid
            projects={filteredProjects}
            view={view}
            menuId={menuId}
            onToggleMenu={(id) =>
              setMenuId((current) =>
                current === id
                  ? null
                  : id
              )
            }
            onOpen={openProject}
            onDuplicate={duplicateProject}
            onDelete={deleteProject}
          />
        ) : (
          <EmptyState
            onClear={() => {
              setFilter("All");
              setSearch("");
            }}
          />
        )}
      </section>
    </div>

    {showModal && (
      <NewProjectModal
        onClose={() =>
          setShowModal(false)
        }
        onCreate={createProject}
      />
    )}
  </div>
);
}