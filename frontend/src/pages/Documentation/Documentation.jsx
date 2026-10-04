import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getDocumentationRuns } from "../../api/dashboard";
import { getProjects } from "../../api/projects";
import { getProject, getProjectFiles, getProjectFileContent } from "../../api/projectStore";
import { getJobBatches, downloadJobArchive } from "../../api/jobs";
import { getCurrentUser } from "../../api/auth";
import { getToken } from "../../utils/getToken";
import "./Documentation.css";

/* Lightweight inline SVG icons — no icon library required. */
function Icon({ name, size = 20, strokeWidth = 1.9 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9" /><path d="M9 21v-6h6v6" /></>,
    folder: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h8v11.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /></>,
    file: <><path d="M6 2.8h8l4 4V21H6z" /><path d="M14 2.8V7h4M9 12h6M9 16h6" /></>,
    history: <><path d="M4 12a8 8 0 1 0 2-5.3" /><path d="M4 4v5h5" /><path d="M12 8v4l3 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .3 2l-1.7 1.7a1.8 1.8 0 0 0-2-.3 1.8 1.8 0 0 0-1 1.6v.2h-2.4V20a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .3l-1.7-1.7a1.8 1.8 0 0 0 .3-2 1.8 1.8 0 0 0-1.6-1H6v-2.4h.6a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.3-2l1.7-1.7a1.8 1.8 0 0 0 2 .3 1.8 1.8 0 0 0 1-1.6V5h2.4v.6a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.3l1.7 1.7a1.8 1.8 0 0 0-.3 2 1.8 1.8 0 0 0 1.6 1h.4V14h-.4a1.8 1.8 0 0 0-1.6 1z" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.6 2.6L16.5 9" /></>,
    folderOpen: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h7.5A1.5 1.5 0 0 1 21 7.5v2H6.2l-2.1 9.3A2 2 0 0 0 6 21h12a2 2 0 0 0 1.9-1.4L21 10H6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    python: <><path d="M12 3c-4 0-4 2-4 3v3h5v1H6c-2 0-3 1-3 4s1 4 3 4h3v-3c0-2 1-3 3-3h4c2 0 3-1 3-3V6c0-2-1-3-4-3z" /><circle cx="9" cy="6" r=".7" fill="currentColor" stroke="none" /><path d="M12 21c4 0 4-2 4-3v-3h-5v-1h7c2 0 3-1 3-4s-1-4-3-4h-3v3c0 2-1 3-3 3H8c-2 0-3 1-3 3v2c0 2 1 4 4 4z" /><circle cx="15" cy="18" r=".7" fill="currentColor" stroke="none" /></>,
    code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></>,
    function: <><path d="M5 6h5c-2 2-2 4 0 6s2 4 0 6H5M19 6h-5c2 2 2 4 0 6s-2 4 0 6h5" /></>,
    cube: <><path d="m12 3 8 4.5-8 4.5-8-4.5z" /><path d="m4 12 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" /></>,
    menu: <><path d="M5 7h14M5 12h14M5 17h14" /></>,
  };

  return <svg {...common}>{paths[name] || paths.file}</svg>;
}

const navItems = [
  ["Dashboard", "home"],
  ["Projects", "folder"],
  ["Documentation", "file"],
  ["History", "history"],
  ["Settings", "settings"],
];

function FileIcon({ name }) {
  const lower = (name || "").toLowerCase();
  if (lower.endsWith(".py")) return <Icon name="python" size={20} />;
  return <Icon name="file" size={19} />;
}

function parsePythonEntities(content) {
  if (!content) return { functions: [], classes: [], imports: [] };
  const functions = [];
  const classes = [];
  const imports = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const defMatch = line.match(/^(\s*)def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):/);
    if (defMatch) {
      let docstring = "";
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const next = lines[j].trim();
        if (next.startsWith('"""') || next.startsWith("'''")) {
          docstring = next.replace(/"""|'''/g, "").trim();
          break;
        }
      }
      functions.push({
        name: `${defMatch[2]}()`,
        params: defMatch[3] ? defMatch[3].trim() : "None",
        returns: line.includes("->") ? line.split("->")[1].replace(":", "").trim() : "None",
        description: docstring || `Defines the ${defMatch[2]} routine and handles core execution logic.`,
        defined: `line ${i + 1}`,
      });
    }

    const classMatch = line.match(/^(\s*)class\s+([a-zA-Z0-9_]+)(?:\((.*?)\))?:/);
    if (classMatch) {
      let docstring = "";
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const next = lines[j].trim();
        if (next.startsWith('"""') || next.startsWith("'''")) {
          docstring = next.replace(/"""|'''/g, "").trim();
          break;
        }
      }
      classes.push({
        name: classMatch[2],
        inherits: classMatch[3] ? classMatch[3].trim() : "object",
        description: docstring || `Encapsulates ${classMatch[2]} behavior and attributes.`,
        defined: `line ${i + 1}`,
      });
    }

    if (line.startsWith("import ") || line.startsWith("from ")) {
      imports.push(line.trim());
    }
  }

  return { functions, classes, imports };
}

export default function Documentation() {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get("projectId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [runs, setRuns] = useState([]);

  const [activeProjectId, setActiveProjectId] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentRun, setCurrentRun] = useState(null);

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);

  const [batches, setBatches] = useState([]);

  const [activeTab, setActiveTab] = useState("Documentation");
  const [innerTab, setInnerTab] = useState("Overview");

  const [fileSearch, setFileSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProjectDropdownOpen(false);
      }
    }
    if (projectDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [projectDropdownOpen]);

  const copyText = (text) => {
    if (!text && !fileContent) return;
    navigator.clipboard?.writeText(text || fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleNavClick = (label) => {
    const routes = {
      Dashboard: "/dashboard",
      Projects: "/projects",
      Documentation: "/documentation",
      History: "/history",
      Settings: "/settings",
    };
    if (routes[label]) {
      navigate(routes[label]);
    }
  };

  // 1. Initial Load: Fetch runs, projects, user
  // Default target projectId to the LATEST RUN's project_id
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
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
                console.error("Failed to fetch user:", err);
                return null;
              })
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (userData) setUser(userData);

        const userProjects = projectsData?.projects || [];
        setProjects(userProjects);

        const allRuns = Array.isArray(runsData) ? runsData : [];
        setRuns(allRuns);

        // Determine active project ID:
        // Priority: route parameter -> query parameter -> latest run's project_id -> first user project
        let targetId = routeProjectId || queryProjectId;
        if (!targetId && allRuns.length > 0 && allRuns[0].project_id) {
          targetId = String(allRuns[0].project_id);
        } else if (!targetId && userProjects.length > 0) {
          targetId = String(userProjects[0].id);
        }

        if (targetId) {
          setActiveProjectId(targetId);
        }
      } catch (err) {
        console.error("Failed to load documentation data:", err);
        if (!cancelled) setError(err.message || "Failed to load documentation data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [routeProjectId, queryProjectId]);

  // 2. When activeProjectId changes: load project details, latest run, batches & files
  useEffect(() => {
    if (!activeProjectId) return;
    let cancelled = false;

    async function loadProjectDetails() {
      try {
        // Project object
        let proj = projects.find((p) => String(p.id) === String(activeProjectId));
        if (!proj) {
          try {
            proj = await getProject(activeProjectId);
          } catch {
            // Ignore if fetch fails
          }
        }
        if (!cancelled && proj) {
          setCurrentProject(proj);
        }

        // Latest documentation run for this project
        const projectRuns = runs.filter(
          (r) => String(r.project_id) === String(activeProjectId)
        );
        const latestRun = projectRuns[0] || runs[0] || null;
        if (!cancelled) {
          setCurrentRun(latestRun);
        }

        // Batches for this project
        let projectBatches = [];
        try {
          const rawBatches = await getJobBatches(activeProjectId, getToken());
          if (Array.isArray(rawBatches)) {
            projectBatches = rawBatches;
          }
        } catch {
          // Batches may not exist yet
        }
        if (!cancelled) {
          setBatches(projectBatches);
        }

        // Files for this project
        let projectFiles = [];
        try {
          const rawFiles = await getProjectFiles(activeProjectId);
          if (Array.isArray(rawFiles)) {
            projectFiles = rawFiles;
          }
        } catch {
          // Not an uploaded project or files endpoint failed
        }

        // If files API returned empty, check if batches contain files
        if (projectFiles.length === 0 && projectBatches.length > 0) {
          const batchFileSet = new Set();
          projectBatches.forEach((b) => {
            (b.files || []).forEach((f) => {
              const p = typeof f === "string" ? f : f?.path;
              if (p) batchFileSet.add(p);
            });
            (b.changes || []).forEach((c) => {
              if (c.file) batchFileSet.add(c.file);
            });
          });
          projectFiles = Array.from(batchFileSet).map((p) => ({
            path: p.replace(/\\/g, "/"),
            name: p.split(/[\\/]/).pop(),
            size: 0,
          }));
        }

        if (!cancelled) {
          setFiles(projectFiles);
          if (projectFiles.length > 0) {
            const mainFile = projectFiles.find((f) =>
              f.path.toLowerCase().endsWith("main.py")
            );
            setSelectedFile(mainFile ? mainFile.path : projectFiles[0].path);
          } else {
            setSelectedFile("");
          }
        }
      } catch (err) {
        console.error("Error loading project details:", err);
      }
    }

    loadProjectDetails();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, projects, runs]);

  // 3. When selectedFile changes: fetch file content
  useEffect(() => {
    if (!activeProjectId || !selectedFile) {
      setFileContent("");
      return;
    }

    let cancelled = false;

    async function fetchContent() {
      setFileLoading(true);
      try {
        const content = await getProjectFileContent(activeProjectId, selectedFile);
        if (!cancelled) {
          setFileContent(typeof content === "string" ? content : "");
        }
      } catch {
        // Fallback: check if batch change contains after/before code for this file
        if (!cancelled) {
          const matchedChange = batches
            .flatMap((b) => b.changes || [])
            .find(
              (c) =>
                c.file &&
                c.file.replace(/\\/g, "/").endsWith(selectedFile.replace(/\\/g, "/"))
            );
          if (matchedChange && (matchedChange.after || matchedChange.before)) {
            setFileContent(matchedChange.after || matchedChange.before);
          } else {
            setFileContent("");
          }
        }
      } finally {
        if (!cancelled) setFileLoading(false);
      }
    }

    fetchContent();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, selectedFile, batches]);

  // Parse Python AST functions, classes, imports, and batch changes
  const parsedEntities = useMemo(() => {
    const normSelected = selectedFile.replace(/\\/g, "/");
    const fileChanges = batches
      .flatMap((b) => b.changes || [])
      .filter((c) => {
        if (!c.file) return false;
        const normC = c.file.replace(/\\/g, "/");
        return (
          normC === normSelected ||
          normC.endsWith("/" + normSelected) ||
          normSelected.endsWith("/" + normC)
        );
      });

    const astData = parsePythonEntities(fileContent);

    // Merge batch docstrings into functions/classes
    const functions = astData.functions.map((fn) => {
      const cleanName = fn.name.replace("()", "");
      const change = fileChanges.find(
        (c) => c.target === cleanName || c.target === fn.name
      );
      if (change) {
        return {
          ...fn,
          description: change.after || change.description || fn.description,
          hasChange: true,
          change,
        };
      }
      return fn;
    });

    const classes = astData.classes.map((cls) => {
      const change = fileChanges.find((c) => c.target === cls.name);
      if (change) {
        return {
          ...cls,
          description: change.after || change.description || cls.description,
          hasChange: true,
          change,
        };
      }
      return cls;
    });

    // If astData had 0 functions/classes but fileChanges has targets
    if (functions.length === 0 && classes.length === 0 && fileChanges.length > 0) {
      fileChanges.forEach((ch, idx) => {
        if (ch.type === "docstring" || ch.type === "function") {
          functions.push({
            name: ch.target ? `${ch.target}()` : `function_${idx + 1}()`,
            params: "None",
            returns: "None",
            description: ch.after || "Docstring generated by DocuAI.",
            defined: `${selectedFile.split("/").pop()}:1`,
            hasChange: true,
            change: ch,
          });
        }
      });
    }

    return {
      functions,
      classes,
      imports: astData.imports,
      changes: fileChanges,
      allProjectChanges: batches.flatMap((b) => b.changes || []),
    };
  }, [fileContent, selectedFile, batches]);

  // Filtered files for sidebar file tree
  const filteredFiles = useMemo(() => {
    if (!fileSearch && !globalSearch) return files;
    const q = (fileSearch || globalSearch).toLowerCase();
    return files.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        (f.name && f.name.toLowerCase().includes(q))
    );
  }, [files, fileSearch, globalSearch]);

  // Date formatting (same as History page)
  const runDateStr = useMemo(() => {
    const d =
      currentRun?.created_at ||
      currentProject?.updated_at ||
      currentProject?.created_at;
    if (!d) return "Oct 4, 2026";
    const dt = new Date(d);
    return !isNaN(dt.getTime())
      ? dt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Oct 4, 2026";
  }, [currentRun, currentProject]);

  const sourceTag =
    currentProject?.source_type === "github" ? "GitHub" : "Local Project";

  const handleDownload = async () => {
    const token = getToken();
    const projName = currentProject?.name || "project";
    const matchedBatch = batches.find((b) => b.job_id);
    if (matchedBatch?.job_id) {
      try {
        await downloadJobArchive(matchedBatch.job_id, token, projName);
        return;
      } catch (err) {
        console.error("Archive download error:", err);
      }
    }
    // Fallback: navigate to DocPilot where job archive and regeneration are available
    navigate(`/docpilot?projectId=${encodeURIComponent(activeProjectId)}`);
  };

  const handleSelectProject = (projId) => {
    setActiveProjectId(projId);
    setProjectDropdownOpen(false);
    navigate(`/documentation/${projId}`);
  };

  const selectedFileName = selectedFile
    ? selectedFile.split(/[\\/]/).pop()
    : "Module";

  return (
    <div className="documentation-app">
      {/* SIDEBAR NAVIGATION */}
      <aside className="doc-sidebar">
        <div
          className="doc-brand"
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <div className="doc-brand-icon">
            <Icon name="file" size={31} />
          </div>
          <span>
            DocuAI<span>.</span>
          </span>
        </div>

        <nav className="doc-nav">
          {navItems.map(([label, icon]) => (
            <button
              key={label}
              className={`doc-nav-item ${
                label === "Documentation" ? "active" : ""
              }`}
              onClick={() => handleNavClick(label)}
            >
              <Icon name={icon} size={24} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN DOCUMENTATION WORKSPACE */}
      <div className="doc-main">
        {/* TOPBAR */}
        <header className="doc-topbar">
          <div className="doc-global-search">
            <Icon name="search" size={22} />
            <input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search files, functions, classes, documentation..."
            />
            <kbd>Ctrl K</kbd>
          </div>

          <div className="doc-profile">
            <button className="doc-bell" title="Notifications">
              <Icon name="bell" size={25} />
              <span />
            </button>
            <div className="doc-avatar">
              {(user?.name?.[0] || "U").toUpperCase()}
            </div>
            <span className="doc-profile-name">{user?.name || "User"}</span>
            <Icon name="chevronDown" size={17} />
          </div>
        </header>

        {/* CONTENT */}
        <main className="doc-content">
          <div className="doc-page-heading">
            <h1>Documentation</h1>
            <p>View and manage your generated documentation.</p>
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: "12px",
                borderRadius: "6px",
                background: "rgba(255, 98, 110, 0.15)",
                border: "1px solid rgba(255, 98, 110, 0.3)",
                color: "#ff8c95",
                fontSize: "12px",
              }}
            >
              {error}
            </div>
          )}

          {/* PROJECT SUMMARY BAR — DB-aligned metrics identical to History page */}
          <section className="project-summary">
            <div className="project-identity">
              <div className="project-folder">
                <Icon name="folder" size={38} />
              </div>
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <div
                  className="project-title"
                  onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                  title="Click to switch project"
                >
                  <strong>{currentProject?.name || "Select Project"}</strong>
                  <Icon name="chevronDown" size={17} />
                </div>
                <p>Generated {runDateStr}</p>

                {/* Project selector dropdown */}
                {projectDropdownOpen && (
                  <div className="project-dropdown-menu" role="menu">
                    {projects.length === 0 ? (
                      <div style={{ padding: "8px 10px", color: "#89969f", fontSize: "11px" }}>
                        No projects found
                      </div>
                    ) : (
                      projects.map((p) => {
                        const isSelected = String(p.id) === String(activeProjectId);
                        const isGh = p.source_type === "github";
                        return (
                          <button
                            key={p.id}
                            className={`project-dropdown-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectProject(p.id)}
                            role="menuitem"
                          >
                            <span className="project-dropdown-item-info">
                              <Icon name={isGh ? "code" : "folder"} size={16} />
                              <span>{p.name || "Untitled Project"}</span>
                            </span>
                            <span className="project-dropdown-item-badge">
                              {isGh ? "GitHub" : "Local"}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <span className="local-tag">{sourceTag}</span>
            </div>

            {/* Field replacement: Docstrings count in place of non-existent Files count */}
            <div className="project-stat">
              <Icon name="file" size={27} />
              <div>
                <strong>{currentRun?.docstrings_count ?? 0}</strong>
                <span>Docstrings</span>
              </div>
            </div>
            <div className="project-stat">
              <Icon name="file" size={27} />
              <div>
                <strong>{currentRun?.classes_count ?? 0}</strong>
                <span>Classes</span>
              </div>
            </div>
            <div className="project-stat">
              <Icon name="function" size={27} />
              <div>
                <strong>{currentRun?.functions_count ?? 0}</strong>
                <span>Functions</span>
              </div>
            </div>
            <div className="project-stat">
              <Icon name="cube" size={27} />
              <div>
                <strong>{currentRun?.modules_count ?? 0}</strong>
                <span>Modules</span>
              </div>
            </div>
          </section>

          {/* TABS ROW & DOWNLOAD */}
          <div className="doc-tabs-row">
            <div className="doc-tabs">
              <button
                className={`doc-tab ${
                  activeTab === "Documentation" ? "active" : ""
                }`}
                onClick={() => setActiveTab("Documentation")}
              >
                <Icon name="file" size={21} /> Documentation
              </button>
              <button
                className={`doc-tab ${
                  activeTab === "BeforeAfter" ? "active" : ""
                }`}
                onClick={() => setActiveTab("BeforeAfter")}
              >
                <span className="before-after-icon">⇄</span> Before &amp; After
              </button>
            </div>

            <button className="download-btn" onClick={handleDownload}>
              <Icon name="download" size={20} /> Download
              <span className="download-divider" />
              <Icon name="chevronDown" size={17} />
            </button>
          </div>

          {/* WORKSPACE AREA */}
          <section className="documentation-workspace">
            {/* FILE TREE */}
            <aside className="file-tree">
              <div className="file-search">
                <Icon name="search" size={20} />
                <input
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="Search files..."
                />
              </div>

              <div className="tree-root">
                <div className="tree-folder-row">
                  <Icon name="chevronDown" size={16} />
                  <Icon name="folder" size={21} />
                  <span>{currentProject?.name || "Project Files"}</span>
                </div>

                <div className="tree-indent">
                  <div className="tree-file-list">
                    {filteredFiles.length === 0 ? (
                      <div
                        style={{
                          padding: "12px 8px",
                          color: "#7e8c94",
                          fontSize: "11px",
                        }}
                      >
                        {loading ? "Loading files..." : "No files available"}
                      </div>
                    ) : (
                      filteredFiles.map((item) => {
                        const isSelected = selectedFile === item.path;
                        const displayName = item.path.split(/[\\/]/).pop();
                        return (
                          <button
                            key={item.path}
                            className={`tree-file ${
                              isSelected ? "selected" : ""
                            }`}
                            onClick={() => setSelectedFile(item.path)}
                            title={item.path}
                          >
                            <span className="tree-spacer" />
                            <FileIcon name={item.path} />
                            <span>{displayName}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* DOCUMENT VIEW */}
            {activeTab === "Documentation" ? (
              <article className="document-view">
                {/* BREADCRUMBS */}
                <div className="breadcrumbs">
                  <Icon name="folder" size={18} />
                  <span>{currentProject?.name || "Project"}</span>
                  <Icon name="chevronRight" size={15} />
                  <strong>{selectedFileName}</strong>
                </div>

                {/* MODULE HEADER */}
                <div className="module-header">
                  <div className="python-large">
                    <Icon name="python" size={30} />
                  </div>
                  <div>
                    <div className="module-title">
                      <h2>{selectedFileName}</h2>
                      <span>{currentProject?.language || "Python"}</span>
                    </div>
                    <p>
                      {parsedEntities.functions.length > 0 ||
                      parsedEntities.classes.length > 0
                        ? `Contains ${parsedEntities.functions.length} function${
                            parsedEntities.functions.length === 1 ? "" : "s"
                          } and ${parsedEntities.classes.length} class${
                            parsedEntities.classes.length === 1 ? "" : "es"
                          } with generated documentation.`
                        : "Module entry point with clean type definitions and documented logic."}
                    </p>
                  </div>
                  <button className="copy-btn" onClick={() => copyText()}>
                    <Icon name={copied ? "check" : "copy"} size={18} />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                {/* INNER TABS */}
                <div className="inner-tabs">
                  {[
                    "Overview",
                    `Functions (${parsedEntities.functions.length})`,
                    `Classes (${parsedEntities.classes.length})`,
                    `Imports (${parsedEntities.imports.length})`,
                    "Code",
                  ].map((tab) => {
                    const tabKey = tab.split(" ")[0];
                    return (
                      <button
                        key={tab}
                        className={innerTab === tabKey ? "active" : ""}
                        onClick={() => setInnerTab(tabKey)}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* SCROLL AREA */}
                <div className="doc-scroll-area">
                  {innerTab === "Code" ? (
                    <div className="code-viewer-container">
                      <pre className="code-pre">
                        {fileLoading
                          ? "Loading file content..."
                          : fileContent ||
                            "# No source code content available for this file."}
                      </pre>
                    </div>
                  ) : innerTab === "Functions" ? (
                    <div className="documentation-copy">
                      <h2 className="functions-heading">Functions</h2>
                      {parsedEntities.functions.length === 0 ? (
                        <p>No functions detected in this file.</p>
                      ) : (
                        parsedEntities.functions.map((fn, idx) => (
                          <FunctionCard
                            key={idx}
                            name={fn.name}
                            description={fn.description}
                            params={fn.params}
                            returns={fn.returns}
                            defined={fn.defined}
                          />
                        ))
                      )}
                    </div>
                  ) : innerTab === "Classes" ? (
                    <div className="documentation-copy">
                      <h2 className="functions-heading">Classes</h2>
                      {parsedEntities.classes.length === 0 ? (
                        <p>No classes defined in this file.</p>
                      ) : (
                        parsedEntities.classes.map((cls, idx) => (
                          <FunctionCard
                            key={idx}
                            name={cls.name}
                            description={cls.description}
                            params={`Inherits: ${cls.inherits}`}
                            returns="Instance"
                            defined={cls.defined}
                          />
                        ))
                      )}
                    </div>
                  ) : innerTab === "Imports" ? (
                    <div className="documentation-copy">
                      <h2>Module Imports</h2>
                      <div className="imports-container">
                        {parsedEntities.imports.length === 0 ? (
                          <p>No external imports found in this file.</p>
                        ) : (
                          parsedEntities.imports.map((imp, idx) => (
                            <div key={idx} className="import-row">
                              {imp}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Default: Overview */
                    <div className="documentation-copy">
                      <h2>Module Overview</h2>
                      <p>
                        {fileContent
                          ? `The ${selectedFileName} module is part of ${
                              currentProject?.name || "this project"
                            }. It contains ${
                              parsedEntities.functions.length
                            } functions and ${
                              parsedEntities.classes.length
                            } classes with automated docstrings generated by DocuAI.`
                          : "Select a file from the repository tree on the left to inspect its generated documentation, function signatures, classes, and code."}
                      </p>

                      {parsedEntities.functions.length > 0 && (
                        <>
                          <h2 className="functions-heading">Functions</h2>
                          {parsedEntities.functions.slice(0, 3).map((fn, idx) => (
                            <FunctionCard
                              key={idx}
                              name={fn.name}
                              description={fn.description}
                              params={fn.params}
                              returns={fn.returns}
                              defined={fn.defined}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* ON THIS PAGE TOC */}
                  <aside className="on-page">
                    <h3>On this page</h3>
                    <a
                      className={innerTab === "Overview" ? "active" : ""}
                      onClick={() => setInnerTab("Overview")}
                    >
                      Module Overview
                    </a>
                    {parsedEntities.functions.length > 0 && (
                      <>
                        <a
                          className={innerTab === "Functions" ? "active" : ""}
                          onClick={() => setInnerTab("Functions")}
                        >
                          Functions ({parsedEntities.functions.length})
                        </a>
                        <div className="on-page-sub">
                          {parsedEntities.functions.slice(0, 4).map((fn, idx) => (
                            <a key={idx} onClick={() => setInnerTab("Functions")}>
                              {fn.name}
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                    {parsedEntities.classes.length > 0 && (
                      <a
                        className={innerTab === "Classes" ? "active" : ""}
                        onClick={() => setInnerTab("Classes")}
                      >
                        Classes ({parsedEntities.classes.length})
                      </a>
                    )}
                    {parsedEntities.imports.length > 0 && (
                      <a
                        className={innerTab === "Imports" ? "active" : ""}
                        onClick={() => setInnerTab("Imports")}
                      >
                        Imports
                      </a>
                    )}
                    <a
                      className={innerTab === "Code" ? "active" : ""}
                      onClick={() => setInnerTab("Code")}
                    >
                      Source Code
                    </a>
                  </aside>
                </div>
              </article>
            ) : (
              /* TAB 2: BEFORE & AFTER VIEW */
              <div className="before-after-view">
                <div style={{ marginBottom: "6px" }}>
                  <h2
                    style={{ margin: 0, fontSize: "16px", color: "#e8ecee" }}
                  >
                    Before &amp; After Comparison
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "12px",
                      color: "#89969e",
                    }}
                  >
                    Compare original source code against DocuAI-enhanced code
                    with generated docstrings and annotations.
                  </p>
                </div>

                {parsedEntities.changes.length === 0 ? (
                  <div
                    style={{
                      padding: "36px 20px",
                      textAlign: "center",
                      border: "1px dashed #212f37",
                      borderRadius: "6px",
                      color: "#89969e",
                    }}
                  >
                    <Icon name="code" size={32} />
                    <h3
                      style={{
                        margin: "10px 0 4px",
                        color: "#e8ecee",
                        fontSize: "14px",
                      }}
                    >
                      No code changes recorded for this file
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px" }}>
                      Run a documentation pipeline in DocPilot to generate new
                      docstrings and see side-by-side diffs.
                    </p>
                    <button
                      className="download-btn"
                      style={{
                        margin: "14px auto 0",
                        display: "inline-flex",
                      }}
                      onClick={() =>
                        navigate(
                          `/docpilot?projectId=${encodeURIComponent(
                            activeProjectId
                          )}`
                        )
                      }
                    >
                      Open DocPilot
                    </button>
                  </div>
                ) : (
                  parsedEntities.changes.map((ch, idx) => (
                    <div key={idx} className="diff-card">
                      <div className="diff-header">
                        <div className="diff-title">
                          <Icon name="python" size={18} />
                          <span>
                            {ch.target
                              ? `${ch.target}`
                              : `Change #${idx + 1}`}
                          </span>
                        </div>
                        <span className="diff-tag">
                          {ch.type || "docstring"}
                        </span>
                      </div>
                      <div className="diff-grid">
                        <div className="diff-pane before">
                          <div className="diff-pane-label">Original Code</div>
                          {ch.before || "# (no original snippet)"}
                        </div>
                        <div className="diff-pane after">
                          <div className="diff-pane-label">
                            DocuAI Documented
                          </div>
                          {ch.after || "# (no documented snippet)"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function FunctionCard({ name, description, params, returns, defined }) {
  const [copied, setCopied] = useState(false);

  const copyCard = () => {
    navigator.clipboard?.writeText(`${name}\n${description}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="function-card">
      <div className="function-card-head">
        <div>
          <h3>{name}</h3>
          <p>{description}</p>
        </div>
        <button
          aria-label={`Copy ${name}`}
          onClick={copyCard}
          title={copied ? "Copied" : "Copy docstring"}
        >
          <Icon name={copied ? "check" : "copy"} size={18} />
        </button>
      </div>

      <div className="function-meta">
        <div>
          <span>Parameters</span>
          <strong>{params}</strong>
        </div>
        <div>
          <span>Returns</span>
          <strong>{returns}</strong>
        </div>
        <div>
          <span>Defined at</span>
          <strong>{defined}</strong>
        </div>
      </div>
    </div>
  );
}
