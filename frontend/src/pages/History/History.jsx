import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDocumentationRuns } from "../../api/dashboard";
import { getProjects } from "../../api/projects";
import { getCurrentUser } from "../../api/auth";
import { getToken } from "../../utils/getToken";
import "./History.css";

// Self-contained SVG icon system — no icon package required.
function SvgIcon({ name, size = 20, strokeWidth = 1.9, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true",
  };

  const icons = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></>,
    folder: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" /></>,
    file: <><path d="M6 2.8h8l4 4V21H6z" /><path d="M14 2.8V7h4M9 11h6M9 15h6M9 18h4" /></>,
    history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3.5 4.5v5h5" /><path d="M12 7.5V12l3 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.6V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.3 4.3" /></>,
    moon: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.7 8.7 0 1 0 20.5 15.5z" />,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></>,
    x: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
    loader: <><path d="M12 3a9 9 0 0 1 9 9" /><path d="M21 12a9 9 0 0 1-9 9" /><path d="M12 21a9 9 0 0 1-9-9" /><path d="M3 12a9 9 0 0 1 9-9" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    list: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 8h9M8 12h9M8 16h6" /><path d="M5.5 8h.01M5.5 12h.01M5.5 16h.01" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.5-4L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 14.5 4l1.5-2" /><path d="M20 20v-5h-5" /></>,
    external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    fileCode: <><path d="M6 2.8h8l4 4V21H6z" /><path d="M14 2.8V7h4" /><path d="m10 11-2 2 2 2M14 11l2 2-2 2" /></>,
    code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></>,
    function: <><path d="M5 6h5c-2 2-2 4 0 6s2 4 0 6H5M19 6h-5c2 2 2 4 0 6s-2 4 0 6h5" /></>,
    boxes: <><path d="m12 3 8 4.5-8 4.5-8-4.5z" /><path d="m4 12 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" /></>,
    github: <><path d="M15 22v-4.2c.1-1.1-.4-1.9-1-2.3 3.3-.4 6.8-1.6 6.8-7.1 0-1.6-.6-2.9-1.6-3.9.2-.4.7-1.9-.2-3.9 0 0-1.3-.4-4.1 1.5a14 14 0 0 0-7.5 0C6.6.2 5.3.6 5.3.6c-.9 2-.4 3.5-.2 3.9-1 1-1.6 2.3-1.6 3.9 0 5.5 3.5 6.7 6.8 7.1-.6.5-1.1 1.3-1.1 2.6V22" /><path d="M8.2 18.2c-3.1 1.1-3.7-1.4-3.7-1.4" /></>,
    gitFolder: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" /><path d="M12 8v7M12 8l2-2M12 11l-2 2" /></>,
  };

  return <svg {...common}>{icons[name] || icons.file}</svg>;
}

const Folder = (p) => <SvgIcon {...p} name="folder" />;
const FileText = (p) => <SvgIcon {...p} name="file" />;
const HistoryIcon = (p) => <SvgIcon {...p} name="history" />;
const Search = (p) => <SvgIcon {...p} name="search" />;
const Moon = (p) => <SvgIcon {...p} name="moon" />;
const Bell = (p) => <SvgIcon {...p} name="bell" />;
const ChevronDown = (p) => <SvgIcon {...p} name="chevronDown" />;
const ChevronRight = (p) => <SvgIcon {...p} name="chevronRight" />;
const MoreVertical = (p) => <SvgIcon {...p} name="more" />;
const CheckCircle2 = (p) => <SvgIcon {...p} name="check" />;
const XCircle = (p) => <SvgIcon {...p} name="x" />;
const LoaderCircle = (p) => <SvgIcon {...p} name="loader" />;
const List = (p) => <SvgIcon {...p} name="list" />;
const Download = (p) => <SvgIcon {...p} name="download" />;
const RefreshCw = (p) => <SvgIcon {...p} name="refresh" />;
const ExternalLink = (p) => <SvgIcon {...p} name="external" />;
const FolderGit2 = (p) => <SvgIcon {...p} name="gitFolder" />;
const Code2 = (p) => <SvgIcon {...p} name="code" />;
const Boxes = (p) => <SvgIcon {...p} name="boxes" />;
const FunctionSquare = (p) => <SvgIcon {...p} name="function" />;
const FileCode2 = (p) => <SvgIcon {...p} name="fileCode" />;

function StatusIcon({ status }) {
  if (status === "failed") {
    return <XCircle size={23} strokeWidth={2.2} />;
  }
  if (status === "processing" || status === "created") {
    return <LoaderCircle size={23} strokeWidth={2.2} />;
  }
  return <CheckCircle2 size={23} strokeWidth={2.2} />;
}

function RunCard({ run, selected, onSelect }) {
  return (
    <div
      className={`run-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(run)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(run)}
    >
      <div className={`status-badge ${run.status}`}>
        <StatusIcon status={run.status} />
      </div>

      <div className="run-main">
        <div className="run-title">{run.title}</div>
        <div className="run-project">
          <Folder size={15} />
          <span>{run.project}</span>
          <span className={`source-tag ${run.source.toLowerCase()}`}>
            {run.source}
          </span>
        </div>
        <div className="run-date">
          {run.date} <span>•</span> {run.time}
        </div>
      </div>

      <div className="run-metrics">
        <span><FileText size={16} /> {run.docstrings} docstrings</span>
        <span><Code2 size={16} /> {run.classes} classes</span>
        <span><FunctionSquare size={16} /> {run.functions} functions</span>
        <span><Boxes size={16} /> {run.modules} modules</span>
      </div>

      <button
        className="details-btn"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(run);
        }}
      >
        View Details <ChevronRight size={16} />
      </button>

      <button
        className="icon-button row-more"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(run);
        }}
        title="View details"
      >
        <MoreVertical size={19} />
      </button>
    </div>
  );
}

function History() {
  const navigate = useNavigate();

  const [runs, setRuns] = useState([]);
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedRun, setSelectedRun] = useState(null);
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("All Projects");
  const [status, setStatus] = useState("All Status");
  const [dateSort, setDateSort] = useState("Newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const token = getToken();

        const [runsData, projectsData, userData] = await Promise.all([
          getDocumentationRuns().catch((err) => {
            console.error("Failed to fetch documentation runs:", err);
            return [];
          }),
          token
            ? getProjects(token).catch((err) => {
                console.error("Failed to fetch projects:", err);
                return { projects: [] };
              })
            : Promise.resolve({ projects: [] }),
          token
            ? getCurrentUser(token).catch((err) => {
                console.error("Failed to fetch current user:", err);
                return null;
              })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (userData) {
          setUser(userData);
        }

        const rawProjects = projectsData?.projects || [];
        setProjects(rawProjects);

        const projectMap = new Map();
        rawProjects.forEach((p) => {
          projectMap.set(String(p.id), p);
        });

        const rawRuns = Array.isArray(runsData) ? runsData : [];
        const totalCount = rawRuns.length;

        const mappedRuns = rawRuns.map((run, index) => {
          const proj = projectMap.get(String(run.project_id));
          const runDate = run.created_at ? new Date(run.created_at) : null;

          const dateStr =
            runDate && !isNaN(runDate.getTime())
              ? runDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";

          const timeStr =
            runDate && !isNaN(runDate.getTime())
              ? runDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "—";

          const isGitHub = proj?.source_type === "github";
          const sourceName = isGitHub ? "GitHub" : "Local";
          const projName = proj?.name || "Project";
          const runStatus = proj?.status || "completed";

          return {
            id: run.id,
            runNumber: totalCount - index,
            title: `Documentation Run #${totalCount - index}`,
            projectId: run.project_id,
            project: projName,
            source: sourceName,
            rawSource: proj?.source_type || "local",
            githubOwner: proj?.github_owner || null,
            githubRepo: proj?.github_repo || null,
            githubUrl: proj?.github_url || null,
            language: proj?.language || "Python",
            progress: proj?.documentation_progress ?? 100,
            date: dateStr,
            time: timeStr,
            createdAt: run.created_at,
            status: runStatus,
            docstrings: run.docstrings_count ?? 0,
            comments: run.comments_count ?? 0,
            readme: run.readme_count ?? 0,
            functions: run.functions_count ?? 0,
            classes: run.classes_count ?? 0,
            methods: run.methods_count ?? 0,
            modules: run.modules_count ?? 0,
          };
        });

        setRuns(mappedRuns);
        if (mappedRuns.length > 0) {
          setSelectedRun(mappedRuns[0]);
        } else {
          setSelectedRun(null);
        }
      } catch (err) {
        console.error("Failed to load history data:", err);
        if (!cancelled) {
          setError(err.message || "Failed to load history data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const projectOptions = useMemo(() => {
    const names = new Set();
    runs.forEach((r) => {
      if (r.project) names.add(r.project);
    });
    return Array.from(names);
  }, [runs]);

  const filteredRuns = useMemo(() => {
    let result = runs.filter((run) => {
      const matchesQuery =
        !query ||
        run.title.toLowerCase().includes(query.toLowerCase()) ||
        run.project.toLowerCase().includes(query.toLowerCase());

      const matchesProject =
        project === "All Projects" || run.project === project;

      const matchesStatus =
        status === "All Status" ||
        run.status.toLowerCase() === status.toLowerCase();

      return matchesQuery && matchesProject && matchesStatus;
    });

    if (dateSort === "Oldest") {
      result = [...result].sort(
        (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      );
    } else {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    }

    return result;
  }, [runs, query, project, status, dateSort]);

  useEffect(() => {
    if (filteredRuns.length > 0) {
      if (!selectedRun || !filteredRuns.some((r) => r.id === selectedRun.id)) {
        setSelectedRun(filteredRuns[0]);
      }
    } else {
      setSelectedRun(null);
    }
  }, [filteredRuns]);

  const stats = useMemo(() => {
    const total = runs.length;
    const completed = runs.filter((r) => r.status === "completed").length;
    const processing = runs.filter((r) => r.status === "processing" || r.status === "created").length;
    const failed = runs.filter((r) => r.status === "failed").length;

    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const processingRate = total > 0 ? Math.round((processing / total) * 100) : 0;
    const failedRate = total > 0 ? Math.round((failed / total) * 100) : 0;

    return {
      total,
      completed,
      processing,
      failed,
      successRate,
      processingRate,
      failedRate,
    };
  }, [runs]);

  return (
    <div className="app-shell">
      <div className="content-area">
        <header className="topbar">
          <div className="global-search">
            <Search size={25} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search runs, projects..."
            />
          </div>

          <div className="top-actions">
            <button className="top-icon"><Moon size={24} /></button>
            <button className="top-icon notification">
              <Bell size={24} />
              <span className="notification-dot">•</span>
            </button>
            <div className="profile">
              <div className="avatar">{(user?.name?.[0] || "U").toUpperCase()}</div>
              <span>{user?.name || "User"}</span>
              <ChevronDown size={18} />
            </div>
          </div>
        </header>

        <main className="main-content">
          <div className="page-heading">
            <h1>History</h1>
            <p>Track all documentation generation runs across your projects.</p>
          </div>

          {error && (
            <div style={{ padding: "12px 16px", marginBottom: "16px", borderRadius: "6px", background: "rgba(255, 98, 110, 0.15)", border: "1px solid rgba(255, 98, 110, 0.3)", color: "#ff8c95", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue"><FileText size={28} /></div>
              <div>
                <strong>{stats.total}</strong>
                <span>Total Runs</span>
                <em>{projects.length} active project{projects.length === 1 ? "" : "s"}</em>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green"><CheckCircle2 size={27} /></div>
              <div>
                <strong>{stats.completed}</strong>
                <span>Completed</span>
                <em>{stats.successRate}% success rate</em>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple"><LoaderCircle size={27} /></div>
              <div>
                <strong>{stats.processing}</strong>
                <span>Processing</span>
                <em>{stats.processingRate}%</em>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red"><XCircle size={27} /></div>
              <div>
                <strong>{stats.failed}</strong>
                <span>Failed</span>
                <em>{stats.failedRate}%</em>
              </div>
            </div>
          </section>

          <div className="history-layout">
            <section className="runs-section">
              <div className="filters">
                <div className="run-search">
                  <Search size={20} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search runs..."
                  />
                </div>

                <select value={project} onChange={(e) => setProject(e.target.value)}>
                  <option>All Projects</option>
                  {projectOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option>All Status</option>
                  <option>Completed</option>
                  <option>Processing</option>
                  <option>Failed</option>
                </select>

                <select value={dateSort} onChange={(e) => setDateSort(e.target.value)}>
                  <option value="Newest">Newest</option>
                  <option value="Oldest">Oldest</option>
                </select>

                <button
                  className={`list-toggle ${showFilters ? "active" : ""}`}
                  onClick={() => setShowFilters(!showFilters)}
                  title="Toggle list options"
                >
                  <List size={22} />
                </button>

                <button
                  className="more-filter"
                  onClick={() => {
                    setQuery("");
                    setProject("All Projects");
                    setStatus("All Status");
                    setDateSort("Newest");
                  }}
                  title="Reset filters"
                >
                  <RefreshCw size={21} />
                </button>
              </div>

              {showFilters && (
                <div className="filter-note">
                  Showing {filteredRuns.length} of {runs.length} documentation runs.
                </div>
              )}

              <div className="runs-list">
                {loading ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#8c9aa4" }}>
                    <div style={{ display: "inline-block", animation: "spin 1s linear infinite", marginBottom: "10px" }}>
                      <LoaderCircle size={28} />
                    </div>
                    <p style={{ margin: 0, fontSize: "13px" }}>Loading documentation runs...</p>
                  </div>
                ) : filteredRuns.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#8c9aa4", border: "1px dashed #1a2830", borderRadius: "8px" }}>
                    <div style={{ marginBottom: "10px", display: "flex", justifyContent: "center", color: "#485a66" }}>
                      <HistoryIcon size={36} />
                    </div>
                    <h3 style={{ margin: "0 0 6px", color: "#f3f5f6", fontSize: "15px" }}>No documentation runs found</h3>
                    <p style={{ margin: "0 0 14px", fontSize: "13px" }}>
                      {query || project !== "All Projects" || status !== "All Status"
                        ? "No runs match the selected filters."
                        : "You haven't run any documentation jobs yet."}
                    </p>
                    {runs.length === 0 && (
                      <button
                        className="details-btn"
                        style={{ margin: "0 auto", display: "inline-flex" }}
                        onClick={() => navigate("/projects")}
                      >
                        Go to Projects <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {filteredRuns.map((run) => (
                      <RunCard
                        key={run.id}
                        run={run}
                        selected={selectedRun?.id === run.id}
                        onSelect={setSelectedRun}
                      />
                    ))}
                    <div style={{ height: "60px", flexShrink: 0 }} aria-hidden="true" />
                  </>
                )}
              </div>
            </section>

            {selectedRun ? (
              <aside className="details-panel">
                <div className="details-header">
                  <h2>Run Details</h2>
                  <button
                    className="project-btn"
                    onClick={() => {
                      if (selectedRun.source === "GitHub" && selectedRun.githubOwner && selectedRun.githubRepo) {
                        navigate(`/repository/${selectedRun.githubOwner}/${selectedRun.githubRepo}`);
                      } else if (selectedRun.projectId) {
                        navigate(`/repository/uploaded/${selectedRun.projectId}`);
                      }
                    }}
                  >
                    View Project <ChevronRight size={15} />
                  </button>
                </div>

                <div className="detail-status">
                  <div className={`large-status ${selectedRun.status}`}>
                    <StatusIcon status={selectedRun.status} />
                  </div>
                  <div>
                    <h3>{selectedRun.title}</h3>
                    <p>
                      {selectedRun.status === "completed"
                        ? "Completed successfully"
                        : selectedRun.status === "processing"
                        ? "Currently processing"
                        : selectedRun.status === "created"
                        ? "Ready to run"
                        : "Run failed"}
                    </p>
                  </div>
                </div>

                <div className="detail-info">
                  <div><span>Project</span><strong>{selectedRun.project}</strong></div>
                  <div><span>Source</span><strong>{selectedRun.source === "Local" ? "Local Project" : selectedRun.source}</strong></div>
                  <div><span>Language</span><strong>{selectedRun.language || "Python"}</strong></div>
                  <div><span>Created At</span><strong>{selectedRun.date} • {selectedRun.time}</strong></div>
                  <div><span>Progress</span><strong>{selectedRun.progress ?? 100}%</strong></div>
                </div>

                <div className="detail-section">
                  <h3>Generated Content</h3>
                  <div className="generated-row"><FileText size={21} /><span>Docstrings</span><b>{selectedRun.docstrings}</b></div>
                  <div className="generated-row"><FunctionSquare size={21} /><span>Functions</span><b>{selectedRun.functions}</b></div>
                  <div className="generated-row"><FolderGit2 size={21} /><span>Classes</span><b>{selectedRun.classes}</b></div>
                  <div className="generated-row"><Boxes size={21} /><span>Modules</span><b>{selectedRun.modules}</b></div>
                  {selectedRun.methods > 0 && (
                    <div className="generated-row"><Code2 size={21} /><span>Methods</span><b>{selectedRun.methods}</b></div>
                  )}
                  <div className="generated-row"><FileCode2 size={21} /><span>README</span><b>{selectedRun.readme > 0 ? "Generated" : "None"}</b></div>
                </div>

                <div className="detail-section actions-section">
                  <h3>Actions</h3>
                  <button
                    className="action-btn primary"
                    onClick={() => {
                      const projName = selectedRun.projectName || "";
                      navigate(
                        `/docpilot?projectId=${encodeURIComponent(selectedRun.projectId)}${projName ? `&projectName=${encodeURIComponent(projName)}` : ""}`,
                        { state: { projectId: selectedRun.projectId, projectName: projName, repositoryName: projName } }
                      );
                    }}
                  >
                    <FileText size={19} /> View Documentation <ExternalLink size={16} />
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => {
                      const projName = selectedRun.projectName || "";
                      navigate(
                        `/docpilot?projectId=${encodeURIComponent(selectedRun.projectId)}${projName ? `&projectName=${encodeURIComponent(projName)}` : ""}`,
                        { state: { projectId: selectedRun.projectId, projectName: projName, repositoryName: projName } }
                      );
                    }}
                  >
                    <Download size={19} /> Download ZIP
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => {
                      const projName = selectedRun.projectName || "";
                      navigate(
                        `/docpilot?projectId=${encodeURIComponent(selectedRun.projectId)}&start=true${projName ? `&projectName=${encodeURIComponent(projName)}` : ""}`,
                        { state: { projectId: selectedRun.projectId, projectName: projName, repositoryName: projName } }
                      );
                    }}
                  >
                    <RefreshCw size={19} /> Re-generate
                  </button>
                  <div style={{ height: "16px", flexShrink: 0 }} aria-hidden="true" />
                </div>
              </aside>
            ) : (
              <aside className="details-panel" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "320px" }}>
                <div style={{ textAlign: "center", color: "#8c9aa4" }}>
                  <HistoryIcon size={38} style={{ opacity: 0.4, marginBottom: "8px" }} />
                  <h3 style={{ margin: "0 0 6px", color: "#f3f5f6", fontSize: "15px" }}>No Run Selected</h3>
                  <p style={{ margin: 0, fontSize: "13px" }}>Select a documentation run to inspect details.</p>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default History;