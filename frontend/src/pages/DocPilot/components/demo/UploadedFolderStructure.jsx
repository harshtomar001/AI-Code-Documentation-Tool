import React, { useState, useEffect, useMemo } from "react";
import { getProjectFiles, getProjectFileContent } from "../../../../api/projectStore";
import { formatFileSize } from "../../../../utils/formatFileSize";
import Icon from "../common/Icon.jsx";
import "./UploadedFolderStructure.css";

function normalizeP(p) {
  return (p || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function matchPaths(p1, p2) {
  if (!p1 || !p2) return false;
  const n1 = normalizeP(p1).toLowerCase();
  const n2 = normalizeP(p2).toLowerCase();
  if (n1 === n2) return true;
  if (n1.endsWith("/" + n2) || n2.endsWith("/" + n1)) return true;
  const name1 = n1.split("/").pop();
  const name2 = n2.split("/").pop();
  return Boolean(name1 && name2 && name1 === name2);
}

function getUploadedFilePath(file) {
  if (!file) return "";
  if (file.path) return normalizeP(file.path);

  const rawPath = file.webkitRelativePath || file.name || "";
  if (!rawPath) return "";

  const parts = rawPath.split("/").filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join("/") : parts[0];
}

function buildTree(files) {
  const root = [];
  if (!Array.isArray(files)) return root;

  for (const file of files) {
    const relativePath = getUploadedFilePath(file);
    if (!relativePath) continue;

    const parts = relativePath.split("/").filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      let existing = current.find((item) => item.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: parts.slice(0, index + 1).join("/"),
          type: isLast ? "blob" : "tree",
          size: isLast ? file.size || 0 : 0,
          file: isLast ? file : null,
          isGeneratedReadme: Boolean(file.isGeneratedReadme),
          children: [],
        };
        current.push(existing);
      }

      if (!isLast) {
        current = existing.children;
      }
    });
  }

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "tree" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children?.length) {
        sortNodes(node.children);
      }
    }
    return nodes;
  };

  return sortNodes(root);
}

function FileTreeNode({
  item,
  level = 0,
  openFolders,
  toggleFolder,
  onSelectFile,
  selectedPath,
  documentedPaths,
  hasGeneratedReadme,
}) {
  const isFolder = item.type === "tree";
  const isOpen = !!openFolders[item.path];
  const isReadme = item.path.toLowerCase().endsWith("readme.md");
  const isDocumented = documentedPaths.has(item.path);

  if (isFolder) {
    return (
      <div className="folder-node">
        <button
          type="button"
          onClick={() => toggleFolder(item.path)}
          className="folder-node__button"
          style={{ paddingLeft: `${10 + level * 16}px` }}
        >
          <span className="folder-node__arrow">{isOpen ? "▾" : "▸"}</span>
          <span className="folder-node__icon">📁</span>
          <span className="folder-node__name">{item.name}</span>
        </button>

        {isOpen && item.children?.length > 0 && (
          <div className="folder-node__children">
            {item.children.map((child) => (
              <FileTreeNode
                key={child.path}
                item={child}
                level={level + 1}
                openFolders={openFolders}
                toggleFolder={toggleFolder}
                onSelectFile={onSelectFile}
                selectedPath={selectedPath}
                documentedPaths={documentedPaths}
                hasGeneratedReadme={hasGeneratedReadme}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedPath === item.path;

  return (
    <button
      type="button"
      onClick={() => onSelectFile(item.file, item.path)}
      className={`file-node__button ${isSelected ? "file-node__button--selected" : ""}`}
      style={{ paddingLeft: `${24 + level * 16}px` }}
      title={item.path}
    >
      <span className="file-node__icon">{isReadme ? "📘" : "📄"}</span>
      <span className="file-node__name">{item.name}</span>

      {isReadme && hasGeneratedReadme && (
        <span className="file-node__readme-badge" title="AI generated README">
          ✓ Generated
        </span>
      )}

      {!isReadme && isDocumented && (
        <span className="file-node__documented-badge" title="Documentation generated for this file">
          ✓ Documented
        </span>
      )}

      {item.size > 0 && (
        <span className="file-node__size">{formatFileSize(item.size)}</span>
      )}
    </button>
  );
}

export default function UploadedFolderStructure({
  projectId,
  batches = [],
  repositoryName = "Uploaded Repository",
  initialFiles = null,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openFolders, setOpenFolders] = useState({});
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [activeChanges, setActiveChanges] = useState([]);
  const [viewMode, setViewMode] = useState("documented"); // "documented" | "original" | "changes"
  const [fileLoading, setFileLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // Extract latest generated README from batches
  const latestReadme = useMemo(() => {
    for (const b of (batches || []).slice().reverse()) {
      if (b.readme && typeof b.readme === "string" && b.readme.trim().length > 0) {
        return b.readme;
      }
    }
    return null;
  }, [batches]);

  // Extract all changes from all batches grouped by file
  const allBatchChanges = useMemo(() => {
    const list = [];
    for (const b of batches || []) {
      for (const ch of b.changes || []) {
        if (ch && ch.file) {
          list.push({
            file: ch.file,
            target: ch.target,
            type: ch.type || "docstring",
            before: ch.before || "",
            after: ch.after || ch.content || "",
            batchId: b.id,
          });
        }
      }
      for (const f of b.files || []) {
        if (f && f.name) {
          for (const h of f.hunks || []) {
            list.push({
              file: f.name,
              target: h.target || h.title,
              type: h.type || "docstring",
              before: h.before || "",
              after: h.after || h.content || "",
              batchId: b.id,
            });
          }
        }
      }
    }
    return list;
  }, [batches]);

  // Map paths that have documentation generated in batches
  const documentedPaths = useMemo(() => {
    const paths = new Set();
    for (const ch of allBatchChanges) {
      paths.add(normalizeP(ch.file));
      paths.add(ch.file);
    }
    return paths;
  }, [allBatchChanges]);

  // Check if a path has documentation
  const isPathDocumented = (p) => {
    if (!p) return false;
    for (const docP of documentedPaths) {
      if (matchPaths(p, docP)) return true;
    }
    return false;
  };

  // Find all changes matching a path
  const getChangesForPath = (p) => {
    if (!p) return [];
    return allBatchChanges.filter((ch) => matchPaths(ch.file, p));
  };

  useEffect(() => {
    let isMounted = true;

    const loadFiles = async () => {
      setLoading(true);
      setError("");

      try {
        let loaded = [];

        // 1. Check initialFiles passed from props / location state
        if (Array.isArray(initialFiles) && initialFiles.length > 0) {
          loaded = initialFiles;
        }

        // 2. Fetch from backend if projectId is present
        if (!loaded.length && projectId) {
          try {
            const res = await getProjectFiles(projectId);
            if (Array.isArray(res) && res.length > 0) {
              loaded = res;
            }
          } catch (apiErr) {
            console.warn("Could not fetch project files via API:", apiErr);
          }
        }

        // 3. Fallback to localStorage cached files for this project
        if (!loaded.length && projectId) {
          try {
            const cached = localStorage.getItem(`uploaded_project_files_${projectId}`);
            if (cached) {
              loaded = JSON.parse(cached);
            }
          } catch (cacheErr) {
            // ignore
          }
        }

        // 4. Fallback to files discovered in batches
        if (!loaded.length && batches.length > 0) {
          const batchFileSet = new Set();
          for (const b of batches) {
            for (const f of b.files || []) {
              if (f.name) batchFileSet.add(f.name);
            }
            for (const ch of b.changes || []) {
              if (ch.file) batchFileSet.add(ch.file);
            }
          }
          if (batchFileSet.size > 0) {
            loaded = Array.from(batchFileSet).map((p) => ({
              path: p,
              name: p.split("/").pop(),
              size: 0,
            }));
          }
        }

        if (!isMounted) return;

        // Ensure README.md is present in file list if generated
        let list = [...loaded];
        if (latestReadme) {
          const hasReadme = list.some((f) => {
            const p = getUploadedFilePath(f).toLowerCase();
            return p === "readme.md" || p.endsWith("/readme.md");
          });
          if (!hasReadme) {
            list.unshift({
              path: "README.md",
              name: "README.md",
              size: latestReadme.length,
              isGeneratedReadme: true,
            });
          }
        }

        setFiles(list);

        if (list.length > 0) {
          // Auto-expand all first-level and second-level folders
          const initialOpen = {};
          for (const f of list) {
            const p = getUploadedFilePath(f);
            const segs = p.split("/").slice(0, -1);
            let acc = "";
            for (const s of segs) {
              acc = acc ? `${acc}/${s}` : s;
              initialOpen[acc] = true;
            }
          }
          setOpenFolders(initialOpen);

          // Auto-select README.md or first documented file or first code file
          const readmeFile = list.find((f) =>
            getUploadedFilePath(f).toLowerCase().endsWith("readme.md")
          );
          const firstDocFile = list.find((f) =>
            isPathDocumented(getUploadedFilePath(f))
          );
          const firstCodeFile = list.find((f) => {
            const p = getUploadedFilePath(f).toLowerCase();
            return (
              p.endsWith(".py") ||
              p.endsWith(".js") ||
              p.endsWith(".jsx") ||
              p.endsWith(".ts") ||
              p.endsWith(".tsx")
            );
          });

          const targetFile = readmeFile || firstDocFile || firstCodeFile || list[0];
          if (targetFile) {
            const p = getUploadedFilePath(targetFile);
            handleSelectFile(targetFile, p);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load uploaded repository files.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFiles();

    return () => {
      isMounted = false;
    };
  }, [projectId, initialFiles, latestReadme]);

  const handleSelectFile = async (file, path) => {
    setSelectedPath(path);
    setSelectedFileObj(file);
    setFileLoading(true);
    setFileContent("");
    setOriginalContent("");
    setViewMode("documented");

    // Case 1: If requested file is README.md and a README was generated by AI
    const isReadme = path.toLowerCase().endsWith("readme.md");
    if (isReadme && latestReadme) {
      setOriginalContent(latestReadme);
      setFileContent(latestReadme);
      setActiveChanges([]);
      setFileLoading(false);
      return;
    }

    const changes = getChangesForPath(path);
    setActiveChanges(changes);

    let raw = "";

    try {
      // 1. Try reading from browser file if available
      if (file && typeof file.text === "function") {
        try {
          raw = await file.text();
        } catch (e) {
          // ignore
        }
      }

      // 2. Try fetching from server
      if (!raw && projectId && path) {
        try {
          raw = await getProjectFileContent(projectId, path);
        } catch (err) {
          // Fallback: try with stripped path or alternative name
          const parts = path.split("/").filter(Boolean);
          if (parts.length > 1) {
            try {
              raw = await getProjectFileContent(projectId, parts.slice(1).join("/"));
            } catch (e2) {
              // ignore
            }
          }
        }
      }

      // 3. If raw file was still not loaded but we have batch changes
      if (!raw && changes.length > 0) {
        raw = changes
          .map(
            (c) =>
              `# ${c.target || c.type || "Component"}\n${c.before || c.after || c.content}`
          )
          .join("\n\n");
      }

      if (!raw) {
        raw = "File content is not available.";
      }

      setOriginalContent(raw);

      // Apply batch documentation changes (insert generated docstrings)
      let documented = raw;
      if (changes.length > 0) {
        for (const ch of changes) {
          const before = ch.before;
          const after = ch.after;
          if (before && after && documented.includes(before)) {
            documented = documented.replace(before, after);
          }
        }
      }

      setFileContent(documented);
    } catch (err) {
      console.error("Failed to read file content:", err);
      setFileContent("Could not read file content from server.");
    } finally {
      setFileLoading(false);
    }
  };

  const toggleFolder = (path) => {
    setOpenFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const filteredFiles = useMemo(() => {
    if (!filterQuery.trim()) return files;
    const q = filterQuery.toLowerCase();
    return files.filter((f) => {
      const p = getUploadedFilePath(f).toLowerCase();
      return p.includes(q);
    });
  }, [files, filterQuery]);

  const tree = useMemo(() => {
    return buildTree(filteredFiles);
  }, [filteredFiles]);

  const totalBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [files]);

  const displayedContent = useMemo(() => {
    if (viewMode === "original") {
      return originalContent;
    }
    return fileContent;
  }, [viewMode, originalContent, fileContent]);

  const handleCopyCode = () => {
    if (!displayedContent) return;
    navigator.clipboard.writeText(displayedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = useMemo(() => {
    if (!displayedContent) return [];
    return displayedContent.split("\n");
  }, [displayedContent]);

  const isCurrentFileDocumented = isPathDocumented(selectedPath);
  const isCurrentReadme = selectedPath.toLowerCase().endsWith("readme.md");

  return (
    <section className="uploaded-folder-section" aria-label="Repository files">
      <div className="uploaded-folder-header">
        <div className="uploaded-folder-header__info">
          <div className="uploaded-folder-header__title-row">
            <span className="uploaded-folder-header__icon">📂</span>
            <h3 className="uploaded-folder-header__title">
              Uploaded Repository Structure
            </h3>
            <span className="uploaded-folder-header__badge">Local Upload</span>
            {latestReadme && (
              <span className="uploaded-folder-header__badge uploaded-folder-header__badge--success">
                README Generated
              </span>
            )}
          </div>
          <p className="uploaded-folder-header__subtitle">
            Inspect the uploaded folder tree and files with AI-generated docstrings and README.
          </p>
        </div>

        <div className="uploaded-folder-header__stats">
          <div className="stat-pill">
            <span className="stat-pill__label">Files</span>
            <span className="stat-pill__value">{files.length}</span>
          </div>
          {totalBytes > 0 && (
            <div className="stat-pill">
              <span className="stat-pill__label">Size</span>
              <span className="stat-pill__value">{formatFileSize(totalBytes)}</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="uploaded-folder-loading">
          <span className="btn__spinner" />
          <span>Loading uploaded folder structure...</span>
        </div>
      ) : error ? (
        <div className="uploaded-folder-error">{error}</div>
      ) : files.length === 0 ? (
        <div className="uploaded-folder-empty">
          <p>No files found in the uploaded repository.</p>
        </div>
      ) : (
        <div className="uploaded-folder-layout">
          {/* LEFT: File Tree Explorer */}
          <div className="uploaded-folder-tree-pane">
            <div className="tree-pane__search">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Filter files..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
              {filterQuery && (
                <button
                  type="button"
                  className="tree-pane__clear-btn"
                  onClick={() => setFilterQuery("")}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="tree-pane__content">
              {tree.length > 0 ? (
                tree.map((node) => (
                  <FileTreeNode
                    key={node.path}
                    item={node}
                    level={0}
                    openFolders={openFolders}
                    toggleFolder={toggleFolder}
                    onSelectFile={handleSelectFile}
                    selectedPath={selectedPath}
                    documentedPaths={documentedPaths}
                    hasGeneratedReadme={Boolean(latestReadme)}
                  />
                ))
              ) : (
                <div className="tree-pane__empty">No matching files found.</div>
              )}
            </div>
          </div>

          {/* RIGHT: File Content Viewer */}
          <div className="uploaded-folder-viewer-pane">
            <div className="viewer-pane__header">
              <div className="viewer-pane__file-info">
                <span className="viewer-pane__file-icon">
                  {isCurrentReadme ? "📘" : "📄"}
                </span>
                <span className="viewer-pane__file-path">
                  {selectedPath || "Select a file to view"}
                </span>

                {isCurrentReadme && latestReadme && (
                  <span className="viewer-pane__doc-tag">✓ Generated README</span>
                )}

                {!isCurrentReadme && isCurrentFileDocumented && (
                  <span className="viewer-pane__doc-tag">
                    ✓ Documented ({activeChanges.length || "1"} change{activeChanges.length === 1 ? "" : "s"})
                  </span>
                )}
              </div>

              {selectedPath && (
                <div className="viewer-pane__actions">
                  {/* View Mode Toggle: Documented vs Original vs Changes */}
                  {!isCurrentReadme && activeChanges.length > 0 && (
                    <div className="viewer-pane__tabs" role="group" aria-label="View mode">
                      <button
                        type="button"
                        className={`viewer-pane__tab-btn ${
                          viewMode === "documented" ? "is-active" : ""
                        }`}
                        onClick={() => setViewMode("documented")}
                        title="Show code with newly generated docstrings"
                      >
                        Documented
                      </button>
                      <button
                        type="button"
                        className={`viewer-pane__tab-btn ${
                          viewMode === "original" ? "is-active" : ""
                        }`}
                        onClick={() => setViewMode("original")}
                        title="Show original source code"
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        className={`viewer-pane__tab-btn ${
                          viewMode === "changes" ? "is-active" : ""
                        }`}
                        onClick={() => setViewMode("changes")}
                        title="View list of docstring changes"
                      >
                        Changes ({activeChanges.length})
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    className="viewer-pane__btn"
                    onClick={handleCopyCode}
                  >
                    {copied ? "✓ Copied" : "Copy Code"}
                  </button>
                </div>
              )}
            </div>

            <div className="viewer-pane__code-wrap">
              {fileLoading ? (
                <div className="viewer-pane__loading">
                  <span className="btn__spinner" />
                  <span>Loading file content...</span>
                </div>
              ) : selectedPath ? (
                viewMode === "changes" && activeChanges.length > 0 ? (
                  <div className="viewer-pane__diff-list">
                    {activeChanges.map((ch, idx) => (
                      <div key={idx} className="diff-card">
                        <div className="diff-card__head">
                          <span className="diff-card__target">
                            {ch.target || `Change #${idx + 1}`}
                          </span>
                          <span className="diff-card__type">{ch.type || "docstring"}</span>
                        </div>
                        <div className="diff-card__body">
                          {ch.before && (
                            <div className="diff-block diff-block--before">
                              <span className="diff-block__label">BEFORE</span>
                              <pre><code>{ch.before}</code></pre>
                            </div>
                          )}
                          <div className="diff-block diff-block--after">
                            <span className="diff-block__label">AFTER (DOCUMENTED)</span>
                            <pre><code>{ch.after}</code></pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="viewer-pane__editor">
                    <div className="viewer-pane__line-numbers">
                      {lines.map((_, idx) => (
                        <span key={idx}>{idx + 1}</span>
                      ))}
                    </div>
                    <pre className="viewer-pane__code">
                      <code>{displayedContent}</code>
                    </pre>
                  </div>
                )
              ) : (
                <div className="viewer-pane__placeholder">
                  Select a file from the repository tree to inspect its content and code.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
