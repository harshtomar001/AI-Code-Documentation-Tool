import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  getGitHubConnectUrl,
  getGitHubRepositories,
  getGitHubStatus,
} from "../../../api/github";
import { createProject } from "../../../api/projects";
import { saveProjectFiles } from "../../../api/projectStore";
import {getToken} from "../../../utils/getToken.js";


const MAX_PROJECT_SIZE = 200 * 1024 * 1024;


/* =========================================================
   GITHUB URL PARSER
   ========================================================= */

function parseGitHubUrl(value) {
  if (!value.trim()) {
    return null;
  }

  try {
    const url = new URL(
      value.trim()
    );

    if (
      url.hostname !== "github.com" &&
      url.hostname !== "www.github.com"
    ) {
      return null;
    }

    const parts = url.pathname
      .split("/")
      .filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    return {
      owner: parts[0],
      repo: parts[1].replace(
        /\.git$/,
        ""
      ),
    };
  } catch {
    return null;
  }
}


/* =========================================================
   PROJECT DETAILS MODAL
   ========================================================= */

export function ProjectSetupModal({
  darkMode,
  initialProject,
  onClose,
  onSave,
}) {
  const [name, setName] =
    useState(
      initialProject?.name || ""
    );

  const [description, setDescription] =
    useState(
      initialProject?.description || ""
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setName(
      initialProject?.name || ""
    );

    setDescription(
      initialProject?.description || ""
    );

    setError("");
  }, [
    initialProject,
  ]);

  const handleSave = () => {
    const trimmedName =
      name.trim();

    if (!trimmedName) {
      setError(
        "Project name is required."
      );
      return;
    }

    setSaving(true);
    setError("");

    const project = {
      ...initialProject,
      name: trimmedName,
      description:
        description.trim(),
    };

    try {
      onSave(project);
    } catch (saveError) {
      console.error(
        "Project save error:",
        saveError
      );

      setError(
        "Could not save this project."
      );

      setSaving(false);
    }
  };

  const modal =
    darkMode
      ? "border-[#292d30] bg-[#111315]"
      : "border-[#dfe2e5] bg-white";

  const input =
    darkMode
      ? "border-[#292d30] bg-[#0d0f10] text-white placeholder:text-[#626970]"
      : "border-[#dfe2e5] bg-[#f8f9fa] text-[#17191c] placeholder:text-[#888f95]";

  const muted =
    darkMode
      ? "text-[#858d93]"
      : "text-[#697078]";

  return (
    <div
      className="
        fixed
        inset-0
        z-[1100]
        flex
        items-center
        justify-center
        bg-black/70
        p-5
      "
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <div
        className={`
          w-full
          max-w-[560px]
          overflow-hidden
          rounded-[10px]
          border
          shadow-2xl
          ${modal}
        `}
      >
        <div className="flex items-center justify-between border-b border-[#292d30] px-6 py-5">
          <div>
            <h2 className="text-[18px] font-semibold">
              Project Details
            </h2>

            <p
              className={`mt-1 text-[12px] ${muted}`}
            >
              Review and edit the project details
              before opening it.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-md
              text-[18px]
              text-[#737b81]
              hover:bg-[#202326]
              hover:text-white
            "
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div>
            <label className="mb-2 block text-[12px] font-medium">
              Project Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter project name"
              className={`
                h-[44px]
                w-full
                rounded-[7px]
                border
                px-3
                text-[13px]
                outline-none
                focus:border-[#ef5148]
                ${input}
              `}
            />
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-medium">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Add a short project description..."
              rows={4}
              className={`
                w-full
                resize-none
                rounded-[7px]
                border
                px-3
                py-3
                text-[13px]
                leading-5
                outline-none
                focus:border-[#ef5148]
                ${input}
              `}
            />
          </div>

          <div className="rounded-[8px] border border-[#292d30] bg-[#0d0f10] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#666e74]">
              Source
            </p>

            <p className="mt-1 text-[12px] text-[#c2c7cb]">
              {initialProject?.source ===
              "upload"
                ? "Local folder upload"
                : "GitHub repository"}
            </p>

            {initialProject?.source ===
              "github" &&
              initialProject?.owner &&
              initialProject?.repo && (
                <p className="mt-1 truncate text-[11px] text-[#666e74]">
                  {initialProject.owner}/
                  {initialProject.repo}
                </p>
              )}
          </div>

          {error && (
            <p className="text-[12px] text-[#ef756d]">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#292d30] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              rounded-[7px]
              border
              border-[#292d30]
              px-4
              py-2.5
              text-[12px]
              text-[#aeb4b9]
              transition
              hover:bg-[#1c1f21]
              hover:text-white
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="
              rounded-[7px]
              bg-[#ef5148]
              px-5
              py-2.5
              text-[12px]
              font-medium
              text-white
              transition
              hover:bg-[#f25a51]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
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

/* =========================================================
   IMPORT REPOSITORY MODAL
   ========================================================= */

function ImportRepositoryModal({
  darkMode,
  onClose,
  onSelectProject,
}) {
  const [github, setGithub] =
    useState({
      connected: false,
      username: null,
      repositories: [],
      loading: true,
    });

  const [search, setSearch] =
    useState("");

  const [repositoryUrl, setRepositoryUrl] =
    useState("");

  const [urlError, setUrlError] =
    useState("");

  const [connecting, setConnecting] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadGitHub = async () => {
      const token =
        getToken();

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
        const status =
          await getGitHubStatus(token);

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

        const result =
          await getGitHubRepositories(
            token
          );

        if (cancelled) return;

        setGithub({
          connected: true,
          username:
            status.username || null,
          repositories:
            result.repositories || [],
          loading: false,
        });
      } catch (error) {
        console.error(
          "Import modal GitHub error:",
          error
        );

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
  }, []);

  const connectGitHub = async () => {
    const token =
      getToken();

    if (!token) {
      return;
    }

    try {
      setConnecting(true);

      const url =
        await getGitHubConnectUrl(
          token
        );

      window.location.href =
        url;
    } catch (error) {
      console.error(
        "GitHub connect error:",
        error
      );

      setConnecting(false);
    }
  };

  const chooseRepository = (
    repository
  ) => {
    const parts = (
      repository.full_name ||
      ""
    ).split("/");

    const owner =
      repository.owner ||
      parts[0];

    const repo =
      repository.name ||
      parts[1];

    if (!owner || !repo) {
      setUrlError(
        "Repository information is incomplete."
      );
      return;
    }

    onSelectProject({
      id: `github:${owner}/${repo}`,
      source: "github",
      owner,
      repo,
      name:
        repository.name || repo,
      description:
        repository.description || "",
      html_url:
        repository.html_url || null,
      tags: repository.language
        ? [repository.language]
        : ["GitHub"],
    });
  };

  const importFromUrl = () => {
    const parsed =
      parseGitHubUrl(
        repositoryUrl
      );

    if (!parsed) {
      setUrlError(
        "Enter a valid GitHub repository URL."
      );
      return;
    }

    setUrlError("");

    onSelectProject({
      id: `github:${parsed.owner}/${parsed.repo}`,
      source: "github",
      owner: parsed.owner,
      repo: parsed.repo,
      name: parsed.repo,
      description: "",
      html_url: `https://github.com/${parsed.owner}/${parsed.repo}`,
      tags: ["GitHub"],
    });
  };

  const filteredRepositories =
    github.repositories.filter(
      (repository) => {
        const value =
          search
            .trim()
            .toLowerCase();

        if (!value) {
          return true;
        }

        return (
          repository.name
            ?.toLowerCase()
            .includes(value) ||
          repository.full_name
            ?.toLowerCase()
            .includes(value)
        );
      }
    );

  const modal =
    darkMode
      ? "border-[#292d30] bg-[#111315]"
      : "border-[#dfe2e5] bg-white";

  const input =
    darkMode
      ? "border-[#292d30] bg-[#0d0f10] text-white placeholder:text-[#626970]"
      : "border-[#dfe2e5] bg-[#f8f9fa] text-[#17191c] placeholder:text-[#888f95]";

  const muted =
    darkMode
      ? "text-[#858d93]"
      : "text-[#697078]";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-5"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`
          w-full
          max-w-[650px]
          overflow-hidden
          rounded-[10px]
          border
          shadow-2xl
          ${modal}
        `}
      >
        <div className="flex items-center justify-between border-b border-[#292d30] px-6 py-5">
          <div>
            <h2 className="text-[18px] font-semibold">
              Import Repository
            </h2>

            <p
              className={`mt-1 text-[12px] ${muted}`}
            >
              Choose a repository or paste a GitHub
              URL.
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

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-medium">
                GitHub Repositories
              </h3>

              <p
                className={`mt-1 text-[11px] ${muted}`}
              >
                Select a repository from your
                connected account.
              </p>
            </div>

            {github.connected && (
              <span className="rounded-full bg-[#17351f] px-2.5 py-1 text-[10px] text-[#49c96d]">
                ● Connected
              </span>
            )}
          </div>

          {!github.loading &&
            !github.connected && (
              <div className="rounded-[8px] border border-[#292d30] bg-[#0d0f10] p-4">
                <p className="text-[13px] font-medium">
                  GitHub is not connected
                </p>

                <p
                  className={`mt-1 text-[11px] leading-5 ${muted}`}
                >
                  Connect GitHub to see your
                  repositories.
                </p>

                <button
                  type="button"
                  disabled={
                    connecting
                  }
                  onClick={
                    connectGitHub
                  }
                  className="mt-4 rounded-[7px] bg-[#ef5148] px-4 py-2.5 text-[12px] font-medium text-white hover:bg-[#f25a51] disabled:opacity-60"
                >
                  {connecting
                    ? "Connecting..."
                    : "Connect GitHub"}
                </button>
              </div>
            )}

          {github.loading && (
            <div className="rounded-[8px] border border-[#292d30] px-4 py-8 text-center text-[12px] text-[#777f85]">
              Loading GitHub repositories...
            </div>
          )}

          {github.connected &&
            !github.loading && (
              <div>
                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search repositories..."
                  className={`h-[40px] w-full rounded-[7px] border px-3 text-[12px] outline-none focus:border-[#ef5148] ${input}`}
                />

                <div className="mt-3 max-h-[230px] space-y-1 overflow-y-auto">
                  {filteredRepositories.length ===
                  0 ? (
                    <div className="px-4 py-7 text-center text-[12px] text-[#70787e]">
                      No repositories found.
                    </div>
                  ) : (
                    filteredRepositories.map(
                      (
                        repository
                      ) => (
                        <button
                          key={
                            repository.id
                          }
                          type="button"
                          onClick={() =>
                            chooseRepository(
                              repository
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-[7px] border border-transparent px-3 py-2.5 text-left transition hover:border-[#292d30] hover:bg-[#1b1e20]"
                        >
                          <span className="text-[16px]">
                            📁
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-medium text-[#d7dbde]">
                              {
                                repository.name
                              }
                            </span>

                            <span className="mt-0.5 block truncate text-[10px] text-[#697177]">
                              {
                                repository.full_name
                              }
                            </span>
                          </span>

                          {repository.private && (
                            <span className="shrink-0 text-[9px] text-[#6f777d]">
                              Private
                            </span>
                          )}

                          <span className="text-[#626970]">
                            ›
                          </span>
                        </button>
                      )
                    )
                  )}
                </div>
              </div>
            )}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#292d30]" />
            <span className="text-[10px] uppercase tracking-[0.08em] text-[#626970]">
              OR
            </span>
            <div className="h-px flex-1 bg-[#292d30]" />
          </div>

          <div>
            <h3 className="text-[13px] font-medium">
              Import using repository URL
            </h3>

            <p
              className={`mt-1 text-[11px] ${muted}`}
            >
              Paste a public or connected GitHub
              repository URL.
            </p>

            <div className="mt-3 flex gap-2 max-[600px]:flex-col">
              <input
                type="url"
                value={repositoryUrl}
                onChange={(event) => {
                  setRepositoryUrl(
                    event.target.value
                  );
                  setUrlError("");
                }}
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    importFromUrl();
                  }
                }}
                placeholder="https://github.com/owner/repository"
                className={`h-[42px] flex-1 rounded-[7px] border px-3 text-[12px] outline-none focus:border-[#ef5148] ${input}`}
              />

              <button
                type="button"
                disabled={
                  !repositoryUrl.trim()
                }
                onClick={
                  importFromUrl
                }
                className="h-[42px] shrink-0 rounded-[7px] bg-[#ef5148] px-5 text-[12px] font-medium text-white hover:bg-[#f25a51] disabled:opacity-50"
              >
                Continue
              </button>
            </div>

            {urlError && (
              <p className="mt-2 text-[11px] text-[#ef756d]">
                {urlError}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-[#292d30] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[7px] border border-[#292d30] px-4 py-2 text-[11px] text-[#aeb4b9] hover:bg-[#1c1f21] hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ACTION CARDS
   ========================================================= */

export default function ActionCards({
  darkMode,
}) {
  const navigate =
    useNavigate();

  const folderInputRef =
    useRef(null);


  const [
    showImportModal,
    setShowImportModal,
  ] = useState(false);

  const [
    showProjectSetup,
    setShowProjectSetup,
  ] = useState(false);

  const [
      showUploadTooLarge,
      setShowUploadTooLarge,
  ] = useState(false);

  const [
      uploadSize,
      setUploadSize,
    ] = useState(0);

  const [
        isCalculatingUploadSize,
        setIsCalculatingUploadSize,
    ] = useState(false);

  const [
    selectedProject,
    setSelectedProject,
  ] = useState(null);

  const [
    uploadInputReset,
    setUploadInputReset,
  ] = useState(0);

  const openProjectSetup = (
    project
  ) => {
    setSelectedProject(
      project
    );

    setShowProjectSetup(
      true
    );
  };

  const calculateFolderSize = async (files) => {
  let totalSize = 0;
  const CHUNK_SIZE = 500;

  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, files.length);

    for (let j = i; j < end; j++) {
      totalSize += files[j].size || 0;

      if (totalSize > MAX_PROJECT_SIZE) {
        return totalSize;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return totalSize;
};

  const handleUploadFolder = async (event) => {

      setIsCalculatingUploadSize(true);

      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });
      const files = Array.from(
        event.target.files || []
      );

      if (!files.length) {
        return;
      }


      try {
        const totalSize = await calculateFolderSize(files);

        if (totalSize > MAX_PROJECT_SIZE) {
          setUploadSize(totalSize);
          setShowUploadTooLarge(true);

          event.target.value = "";

          setUploadInputReset(
            (value) => value + 1
          );

          return;
        }

        const firstPath =
          files[0].webkitRelativePath ||
          files[0].name ||
          "Uploaded Project";

        const projectName =
          firstPath.includes("/")
            ? firstPath.split("/")[0]
            : files[0].name;

        openProjectSetup({
          id: crypto.randomUUID(),
          source: "upload",
          name: projectName,
          description:
            "Project uploaded from your computer.",
          tags: ["Local Project"],
          files,
        });

        event.target.value = "";

        setUploadInputReset(
          (value) => value + 1
        );
      }
      finally {
        setIsCalculatingUploadSize(false);
      }
  };

  const saveAndOpenProject = async (project) => {

      console.log("save and open project called");
  const token = getToken();

  if (!token) {
    throw new Error("Please login first.");
  }

  const sourceType = project.source || "github";

  const payload = {
    name: project.name,
    description: project.description || null,
    source_type: sourceType,
    github_owner: project.owner || null,
    github_repo: project.repo || null,
    github_url: project.html_url || null,
    local_storage_path: null,
    language:
      project.language ||
      project.repository?.language ||
      null,
    status:
      sourceType === "upload"
        ? "uploaded"
        : "imported",
    documentation_progress:
      Number.isFinite(project.progress)
        ? project.progress
        : 0,
  };

  const saved = await createProject(
    token,
    payload
  );

  console.log("save and open project after CREATE PROJECT");

  if (
    sourceType === "upload" &&
    project.files?.length
  ) {
    await saveProjectFiles(
      saved.id,
      project.files
    );

    console.log("save and open project after SAVE PROJECT FILES");

  }

  window.dispatchEvent(
    new CustomEvent(
      "docuai-projects-updated"
    )
  );

  setShowProjectSetup(false);
  setSelectedProject(null);

  if (sourceType === "upload") {
      navigate(
          `/repository/uploaded/${encodeURIComponent(
            saved.id
          )}`,
          {
            state: {
              source: "upload",
              projectId: saved.id,
              projectName: saved.name,
              files: project.files || [],
              project: saved,
            },
          }
    );


    return;
  }

  navigate(
    `/repository/${encodeURIComponent(
      saved.github_owner || project.owner
    )}/${encodeURIComponent(
      saved.github_repo || project.repo
    )}`
  );
};

  const card =
    darkMode
      ? "border-[#292d30] bg-[#101213] hover:bg-[#151819]"
      : "border-[#dfe2e5] bg-white hover:bg-[#f8f9fa]";

  const title =
    darkMode
      ? "text-[#f2f3f4]"
      : "text-[#17191c]";

  const description =
    darkMode
      ? "text-[#858d93]"
      : "text-[#666d73]";

  const symbol =
    darkMode
      ? "text-[#f2f3f4]"
      : "text-[#24282b]";

  return (
    <>
      <section className="mb-[20px] grid grid-cols-2 gap-[22px] max-[700px]:grid-cols-1">
        {/* IMPORT */}

        <button
          type="button"
          onClick={() =>
            setShowImportModal(
              true
            )
          }
          className={`group flex min-h-[92px] items-center gap-5 rounded-[8px] border px-8 text-left transition ${card}`}
        >
          <div
            className={`flex w-[42px] shrink-0 items-center justify-center text-[20px] font-semibold ${symbol}`}
          >
            GH
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className={`text-[15px] font-medium ${title}`}
            >
              Import Repository
            </h3>

            <p
              className={`mt-1 text-[12px] ${description}`}
            >
              Connect your GitHub repo and generate
              documentation.
            </p>
          </div>

          <span className="text-[22px] text-[#767e84] transition-transform group-hover:translate-x-1">
            ›
          </span>
        </button>

        {/* UPLOAD */}

        <button
          type="button"
          onClick={() =>
            folderInputRef.current?.click()
          }
          className={`group flex min-h-[92px] items-center gap-5 rounded-[8px] border px-8 text-left transition ${card}`}
        >
          <div
            className={`flex w-[42px] shrink-0 items-center justify-center text-[23px] ${symbol}`}
          >
            ↑
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className={`text-[15px] font-medium ${title}`}
            >
              Upload Project
            </h3>

            <p
              className={`mt-1 text-[12px] ${description}`}
            >
              Upload a project folder from your computer.
            </p>
          </div>

          <span className="text-[22px] text-[#767e84] transition-transform group-hover:translate-x-1">
            ›
          </span>
        </button>

        <input
          key={uploadInputReset}
          ref={folderInputRef}
          type="file"
          multiple
          webkitdirectory=""
          directory=""
          onChange={
            handleUploadFolder
          }
          className="hidden"
        />
      </section>

      {showImportModal && (
        <ImportRepositoryModal
          darkMode={darkMode}
          onClose={() =>
            setShowImportModal(
              false
            )
          }
          onSelectProject={
            (project) => {
              setShowImportModal(
                false
              );

              openProjectSetup(
                project
              );
            }
          }
        />
      )}

        {isCalculatingUploadSize && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4">
            <div
              className={`w-full max-w-[420px] rounded-[12px] border p-6 shadow-2xl ${
                darkMode
                  ? "border-[#292d30] bg-[#101213]"
                  : "border-[#dfe2e5] bg-white"
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`h-10 w-10 animate-spin rounded-full border-4 border-t-transparent ${
                    darkMode
                      ? "border-[#d8dcdf] border-t-transparent"
                      : "border-[#24282b] border-t-transparent"
                  }`}
                />

                <h2
                  className={`mt-5 text-[17px] font-semibold ${
                    darkMode
                      ? "text-[#f2f3f4]"
                      : "text-[#17191c]"
                  }`}
                >
                  Checking project size
                </h2>

                <p
                  className={`mt-2 text-[13px] ${
                    darkMode
                      ? "text-[#858d93]"
                      : "text-[#666d73]"
                  }`}
                >
                  Calculating the size of the selected folder...
                </p>
              </div>
            </div>
          </div>
        )}

        {showUploadTooLarge && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
            <div
              className={`w-full max-w-[520px] rounded-[12px] border p-6 shadow-2xl ${
                darkMode
                  ? "border-[#292d30] bg-[#101213]"
                  : "border-[#dfe2e5] bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    className={`text-[18px] font-semibold ${
                      darkMode
                        ? "text-[#f2f3f4]"
                        : "text-[#17191c]"
                    }`}
                  >
                    Project Too Large
                  </h2>

                  <p
                    className={`mt-1 text-[13px] ${
                      darkMode
                        ? "text-[#858d93]"
                        : "text-[#666d73]"
                    }`}
                  >
                    The selected folder exceeds the maximum
                    allowed project size.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowUploadTooLarge(false)
                  }
                  className={`flex h-9 w-9 items-center justify-center rounded-[8px] text-[18px] ${
                    darkMode
                      ? "bg-[#1b1f21] text-[#d8dcdf] hover:bg-[#24282b]"
                      : "bg-[#f1f2f3] text-[#555b60] hover:bg-[#e7e9eb]"
                  }`}
                >
                  ×
                </button>
              </div>

              <div
                className={`mt-6 rounded-[8px] border p-4 ${
                  darkMode
                    ? "border-[#292d30] bg-[#151819]"
                    : "border-[#dfe2e5] bg-[#f8f9fa]"
                }`}
              >
                <p
                  className={`text-[14px] ${
                    darkMode
                      ? "text-[#f2f3f4]"
                      : "text-[#17191c]"
                  }`}
                >
                  The selected folder exceeds the maximum allowed size of{" "}
                <span className="font-semibold">
                  {(MAX_PROJECT_SIZE / (1024 * 1024)).toFixed(0)} MB
                </span>
                .
                </p>

                <p
                  className={`mt-2 text-[12px] ${
                    darkMode
                      ? "text-[#858d93]"
                      : "text-[#666d73]"
                  }`}
                >
                  Please select a smaller folder and try again.
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowUploadTooLarge(false)
                  }
                  className="rounded-[8px] bg-[#ef4444] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#dc2626]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {showProjectSetup && (
        <ProjectSetupModal
          darkMode={darkMode}
          initialProject={
            selectedProject
          }
          onClose={() => {
            setShowProjectSetup(
              false
            );

            setSelectedProject(
              null
            );
          }}
          onSave={
            saveAndOpenProject
          }
        />
      )}
    </>
  );
}
