import { useEffect, useRef, useState } from "react";

import {
  getGitHubConnectUrl,
  getGitHubRepositories,
  getGitHubStatus,
} from "../../../api/github";

import {
  saveProject,
  saveProjectFiles,
} from "../../../api/projectStore";

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

function parseGitHubUrl(value) {
  try {
    const url = new URL(value.trim());

    if (
      url.hostname !== "github.com" &&
      url.hostname !== "www.github.com"
    ) {
      return null;
    }

    const parts = url.pathname
      .split("/")
      .filter(Boolean);

    if (parts.length < 2) return null;

    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/, ""),
    };
  } catch {
    return null;
  }
}

function getUploadedProjectName(files) {
  if (!files?.length) return "New Project";

  const path =
    files[0].webkitRelativePath || files[0].name;

  return path.includes("/")
    ? path.split("/")[0]
    : files[0].name;
}

export default function ProjectSetupModal({
  darkMode,
  source = "github",
  initialRepository = null,
  onClose,
  onSaved,
}) {
  const folderInputRef = useRef(null);

  const [github, setGithub] = useState({
    connected: false,
    username: null,
    repositories: [],
    loading: true,
  });

  const [projectName, setProjectName] = useState(
    initialRepository?.name || ""
  );

  const [description, setDescription] = useState(
    initialRepository?.description || ""
  );

  const [repositoryUrl, setRepositoryUrl] = useState(
    initialRepository?.html_url || ""
  );

  const [selectedRepository, setSelectedRepository] =
    useState(initialRepository);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const isUpload = source === "upload";

  useEffect(() => {
    if (isUpload) {
      setGithub({
        connected: false,
        username: null,
        repositories: [],
        loading: false,
      });
      return undefined;
    }

    let cancelled = false;

    const loadGitHub = async () => {
      const token = getToken();

      if (!token) {
        if (!cancelled) {
          setGithub({
            connected: false,
            username: null,
            repositories: [],
            loading: false,
          });
        }
        return;
      }

      try {
        const status = await getGitHubStatus(token);

        if (cancelled) return;

        if (!status.connected) {
          setGithub({
            connected: false,
            username: null,
            repositories: [],
            loading: false,
          });
          return;
        }

        const result = await getGitHubRepositories(token);
        const repositories = result.repositories || [];

        if (cancelled) return;

        setGithub({
          connected: true,
          username: status.username || null,
          repositories,
          loading: false,
        });

        // When the user opens Import Repository from the dashboard,
        // pre-fill the form with the first available repository.
        if (!initialRepository && repositories.length > 0) {
          const first = repositories[0];
          setSelectedRepository(first);
          setProjectName(first.name || "");
          setDescription(first.description || "");
          setRepositoryUrl(first.html_url || "");
        }
      } catch (loadError) {
        console.error("Project setup GitHub error:", loadError);

        if (!cancelled) {
          setGithub({
            connected: false,
            username: null,
            repositories: [],
            loading: false,
          });
        }
      }
    };

    loadGitHub();

    return () => {
      cancelled = true;
    };
  }, [isUpload]);

  const selectRepository = (repository) => {
    setSelectedRepository(repository);
    setProjectName(repository.name || "");
    setDescription(repository.description || "");
    setRepositoryUrl(repository.html_url || "");
    setError("");
  };

  const chooseFolder = (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    setUploadedFiles(files);
    setProjectName(
      getUploadedProjectName(files)
    );
    setError("");

    event.target.value = "";
  };

  const connectGitHub = async () => {
    const token = getToken();

    if (!token) {
      setError("Please login first.");
      return;
    }

    try {
      setConnecting(true);
      const url = await getGitHubConnectUrl(token);
      window.location.href = url;
    } catch (connectError) {
      console.error(connectError);
      setError(
        connectError.response?.data?.detail ||
          "Could not connect GitHub."
      );
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    setError("");

    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }

    if (isUpload && !uploadedFiles.length) {
      setError("Please choose a project folder.");
      return;
    }

    let repository = selectedRepository;

    if (!isUpload && !repository) {
      const parsed = parseGitHubUrl(repositoryUrl);

      if (!parsed) {
        setError("Select a repository or enter a valid GitHub URL.");
        return;
      }

      repository = {
        owner: parsed.owner,
        name: parsed.repo,
        full_name: `${parsed.owner}/${parsed.repo}`,
        html_url: repositoryUrl.trim(),
        private: false,
        description: description.trim() || null,
      };
    }

    const projectId = `${
      isUpload ? "local" : "github"
    }-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const project = {
      id: projectId,
      name: projectName.trim(),
      description: description.trim(),
      source: isUpload ? "upload" : "github",
      tags: isUpload
        ? ["Local Upload"]
        : ["GitHub", repository.language || "Repository"],
      progress: 0,
      createdAt: new Date().toISOString(),
      repository: isUpload
        ? null
        : {
            owner:
              repository.owner ||
              repository.full_name?.split("/")[0],
            name: repository.name,
            full_name: repository.full_name,
            html_url: repository.html_url,
            private: !!repository.private,
            language: repository.language || null,
          },
    };

    try {
      setSaving(true);

      saveProject(project);

      if (isUpload) {
        await saveProjectFiles(
          projectId,
          uploadedFiles
        );
      }

      onSaved(project, {
        files: isUpload ? uploadedFiles : [],
      });
    } catch (saveError) {
      console.error("Project save error:", saveError);
      setError("Could not save this project.");
    } finally {
      setSaving(false);
    }
  };

  const filteredRepositories =
    github.repositories.filter((repository) => {
      const value = search.trim().toLowerCase();

      if (!value) return true;

      return (
        repository.name
          ?.toLowerCase()
          .includes(value) ||
        repository.full_name
          ?.toLowerCase()
          .includes(value)
      );
    });

  const modal = darkMode
    ? "border-[#292d30] bg-[#111315]"
    : "border-[#dfe2e5] bg-white";

  const input = darkMode
    ? "border-[#292d30] bg-[#0d0f10] text-white placeholder:text-[#626970]"
    : "border-[#dfe2e5] bg-[#f8f9fa] text-[#17191c] placeholder:text-[#888f95]";

  const muted = darkMode
    ? "text-[#858d93]"
    : "text-[#697078]";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full max-w-[680px] overflow-hidden rounded-[10px] border shadow-2xl ${modal}`}
      >
        <div className="flex items-center justify-between border-b border-[#292d30] px-6 py-5">
          <div>
            <h2 className="text-[18px] font-semibold">
              Project Details
            </h2>
            <p className={`mt-1 text-[12px] ${muted}`}>
              Review the details before importing this project.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[18px] text-[#737b81] hover:bg-[#202326] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4">
            <div>
              <label className={`text-[11px] ${muted}`}>
                Project Name
              </label>
              <input
                value={projectName}
                onChange={(event) =>
                  setProjectName(event.target.value)
                }
                placeholder="Project name"
                className={`mt-1 h-[42px] w-full rounded-[7px] border px-3 text-[12px] outline-none focus:border-[#ef5148] ${input}`}
              />
            </div>

            <div>
              <label className={`text-[11px] ${muted}`}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Project description"
                rows={3}
                className={`mt-1 w-full resize-none rounded-[7px] border px-3 py-2.5 text-[12px] outline-none focus:border-[#ef5148] ${input}`}
              />
            </div>

            {isUpload ? (
              <div>
                <label className={`text-[11px] ${muted}`}>
                  Project Folder
                </label>

                <div className="mt-1 flex items-center gap-3 rounded-[7px] border border-[#292d30] bg-[#0d0f10] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-[#d8dcdf]">
                      {uploadedFiles.length
                        ? `${projectName} • ${uploadedFiles.length} files selected`
                        : "No folder selected"}
                    </p>
                    <p className="mt-1 text-[10px] text-[#646c72]">
                      Choose a folder from your computer.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      folderInputRef.current?.click()
                    }
                    className="shrink-0 rounded-[7px] border border-[#292d30] px-3 py-2 text-[11px] text-[#aeb4b9] hover:bg-[#1c1f21] hover:text-white"
                  >
                    Choose Folder
                  </button>
                </div>

                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  webkitdirectory=""
                  directory=""
                  onChange={chooseFolder}
                  className="hidden"
                />
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <label className={`text-[11px] ${muted}`}>
                      GitHub Repository
                    </label>
                    {github.connected && (
                      <span className="ml-2 rounded-full bg-[#17351f] px-2 py-0.5 text-[9px] text-[#49c96d]">
                        ● {github.username}
                      </span>
                    )}
                  </div>
                </div>

                {!github.loading && github.connected && (
                  <>
                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder="Search connected repositories..."
                      className={`h-[40px] w-full rounded-[7px] border px-3 text-[12px] outline-none focus:border-[#ef5148] ${input}`}
                    />

                    <div className="mt-2 max-h-[170px] space-y-1 overflow-y-auto">
                      {filteredRepositories.map((repository) => (
                        <button
                          key={repository.id}
                          type="button"
                          onClick={() =>
                            selectRepository(repository)
                          }
                          className={`flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-left transition ${
                            selectedRepository?.id === repository.id
                              ? "bg-[#242729]"
                              : "hover:bg-[#1b1e20]"
                          }`}
                        >
                          <span>📁</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] text-[#d7dbde]">
                              {repository.name}
                            </span>
                            <span className="block truncate text-[10px] text-[#697177]">
                              {repository.full_name}
                            </span>
                          </span>
                          {repository.private && (
                            <span className="text-[9px] text-[#6f777d]">
                              Private
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {!github.loading && !github.connected && (
                  <div className="rounded-[8px] border border-[#292d30] bg-[#0d0f10] p-4">
                    <p className="text-[12px] font-medium text-white">
                      GitHub is not connected
                    </p>
                    <p className={`mt-1 text-[11px] ${muted}`}>
                      Connect GitHub to select repositories from your account.
                    </p>
                    <button
                      type="button"
                      disabled={connecting}
                      onClick={connectGitHub}
                      className="mt-3 rounded-[7px] bg-[#ef5148] px-4 py-2.5 text-[11px] font-medium text-white hover:bg-[#f25a51] disabled:opacity-60"
                    >
                      {connecting
                        ? "Connecting..."
                        : "Connect GitHub"}
                    </button>
                  </div>
                )}

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#292d30]" />
                  <span className="text-[10px] text-[#626970]">
                    OR
                  </span>
                  <div className="h-px flex-1 bg-[#292d30]" />
                </div>

                <label className={`text-[11px] ${muted}`}>
                  Repository URL
                </label>
                <input
                  value={repositoryUrl}
                  onChange={(event) => {
                    setRepositoryUrl(event.target.value);
                    setSelectedRepository(null);
                  }}
                  placeholder="https://github.com/owner/repository"
                  className={`mt-1 h-[42px] w-full rounded-[7px] border px-3 text-[12px] outline-none focus:border-[#ef5148] ${input}`}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-[7px] bg-[#321e1c] px-3 py-2 text-[11px] text-[#ef756d]">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#292d30] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[7px] border border-[#292d30] px-4 py-2.5 text-[11px] text-[#aeb4b9] hover:bg-[#1c1f21] hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-[7px] bg-[#ef5148] px-5 py-2.5 text-[11px] font-medium text-white hover:bg-[#f25a51] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : "Save & Open Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
