import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getGitHubFile,
  getGitHubRepository,
} from "../../api/github";

import {
  getProject,
  getProjectFiles,
  getProjectFileContent,
} from "../../api/projectStore";
import {getToken} from "../../utils/getToken.js";
import {formatDate} from "../../utils/formatDate.js";
import {formatFileSize} from "../../utils/formatFileSize.js";
import RepositoryLoading from "./RepositoryLoading";


const EMPTY_FILES = [];

function getUploadedFilePath(file) {
  if (!file) {
    return "";
  }

  /* -------------------------------------------------------
     Persisted backend file
     ------------------------------------------------------- */

  if (file.path) {
    return file.path;
  }

  /* -------------------------------------------------------
     Fresh browser File
     ------------------------------------------------------- */

  const rawPath =
    file.webkitRelativePath ||
    file.name ||
    "";

  if (!rawPath) {
    return "";
  }

  const parts = rawPath
    .split("/")
    .filter(Boolean);

  /*
   * Browser folder upload:
   *
   * ProjectName/src/main.py
   *
   * becomes:
   *
   * src/main.py
   */

  return parts.length > 1
    ? parts.slice(1).join("/")
    : parts[0];
}

/* =========================================================
   BUILD FILE TREE
   ========================================================= */

function buildFileTree(files) {
  const root = [];

  if (!Array.isArray(files)) {
    return root;
  }

  const sortedFiles = [...files].sort(
    (a, b) =>
      String(a.path || "").localeCompare(
        String(b.path || "")
      )
  );

  for (const file of sortedFiles) {
    if (!file?.path) {
      continue;
    }

    const parts =
      file.path.split("/");

    let current = root;

    parts.forEach(
      (part, index) => {
        const isLast =
          index ===
          parts.length - 1;

        let existing =
          current.find(
            (item) =>
              item.name === part
          );

        if (!existing) {
          existing = {
            name: part,
            path: parts
              .slice(0, index + 1)
              .join("/"),
            type: isLast
              ? file.type
              : "tree",
            size: isLast
              ? file.size || 0
              : 0,
            children: [],
          };

          current.push(existing);
        }

        if (!isLast) {
          current =
            existing.children;
        }
      }
    );
  }

  return root;
}

/* =========================================================
   BUILD UPLOADED FILE TREE
   ========================================================= */

function buildUploadedFileTree(files) {
  const root = [];

  if (!Array.isArray(files)) {
    return root;
  }

  for (const file of files) {
    const relativePath =
      getUploadedFilePath(file);

    if (!relativePath) {
      continue;
    }

    const parts = relativePath
      .split("/")
      .filter(Boolean);

    let current = root;

    parts.forEach(
      (part, index) => {
        const isLast =
          index ===
          parts.length - 1;

        let existing =
          current.find(
            (item) =>
              item.name === part
          );

        if (!existing) {
          existing = {
            name: part,
            path: parts
              .slice(0, index + 1)
              .join("/"),
            type: isLast
              ? "blob"
              : "tree",
            size: isLast
              ? file.size || 0
              : 0,

            /*
             * Keep the original object.
             *
             * Fresh upload:
             * Browser File
             *
             * After refresh:
             * Backend metadata object
             */
            file: isLast
              ? file
              : null,

            children: [],
          };

          current.push(existing);
        }

        if (!isLast) {
          current =
            existing.children;
        }
      }
    );
  }

  return root;
}

/* =========================================================
   FILE TREE
   ========================================================= */

function FileTree({
  items,
  level = 0,
  onFileClick,
  selectedPath,
}) {
  const [openFolders, setOpenFolders] =
    useState({});

  const toggleFolder = (path) => {
    setOpenFolders(
      (current) => ({
        ...current,
        [path]:
          !current[path],
      })
    );
  };

  if (!items?.length) {
    return null;
  }

  return (
    <div>
      {items.map((item) => {
        const isFolder =
          item.type === "tree";

        const isOpen =
          !!openFolders[
            item.path
          ];

        /* ===================================================
           FOLDER
           =================================================== */

        if (isFolder) {
          return (
            <div
              key={item.path}
            >
              <button
                type="button"
                onClick={() =>
                  toggleFolder(
                    item.path
                  )
                }
                className="
                  flex
                  w-full
                  items-center
                  gap-2
                  rounded-md
                  px-3
                  py-2
                  text-left
                  text-[13px]
                  text-[#b8bec3]
                  transition
                  hover:bg-[#202427]
                  hover:text-white
                "
                style={{
                  paddingLeft:
                    `${12 + level * 18}px`,
                }}
              >
                <span className="w-3 shrink-0 text-center">
                  {isOpen
                    ? "▾"
                    : "▸"}
                </span>

                <span className="shrink-0">
                  📁
                </span>

                <span className="min-w-0 flex-1 truncate">
                  {item.name}
                </span>
              </button>

              {isOpen &&
                item.children?.length >
                  0 && (
                  <FileTree
                    items={
                      item.children
                    }
                    level={
                      level + 1
                    }
                    onFileClick={
                      onFileClick
                    }
                    selectedPath={
                      selectedPath
                    }
                  />
                )}
            </div>
          );
        }

        /* ===================================================
           FILE
           =================================================== */

        return (
          <button
            key={item.path}
            type="button"
            onClick={() =>
              onFileClick(
                item.path
              )
            }
            className={`
              flex
              w-full
              items-center
              gap-2
              rounded-md
              px-3
              py-2
              text-left
              text-[13px]
              transition
              ${
                selectedPath ===
                item.path
                  ? "bg-[#242729] text-white"
                  : "text-[#aeb4b9] hover:bg-[#202427] hover:text-white"
              }
            `}
            style={{
              paddingLeft:
                `${30 + level * 18}px`,
            }}
            title={item.path}
          >
            <span className="shrink-0">
              📄
            </span>

            <span className="min-w-0 flex-1 truncate">
              {item.name}
            </span>

            {item.size > 0 && (
              <span className="shrink-0 text-[9px] text-[#666e74]">
                {formatFileSize(
                  item.size
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   UPLOADED FILE TREE
   ========================================================= */

function UploadedFileTree({
  items,
  level = 0,
  onFileClick,
  selectedPath,
}) {
  const [openFolders, setOpenFolders] =
    useState({});

  const toggleFolder = (path) => {
    setOpenFolders(
      (current) => ({
        ...current,
        [path]:
          !current[path],
      })
    );
  };

  if (!items?.length) {
    return null;
  }

  return (
    <div>
      {items.map((item) => {
        const isFolder =
          item.type === "tree";

        const isOpen =
          !!openFolders[
            item.path
          ];

        /* ===================================================
           FOLDER
           =================================================== */

        if (isFolder) {
          return (
            <div
              key={item.path}
            >
              <button
                type="button"
                onClick={() =>
                  toggleFolder(
                    item.path
                  )
                }
                className="
                  flex
                  w-full
                  items-center
                  gap-2
                  rounded-md
                  px-3
                  py-2
                  text-left
                  text-[13px]
                  text-[#b8bec3]
                  transition
                  hover:bg-[#202427]
                  hover:text-white
                "
                style={{
                  paddingLeft:
                    `${12 + level * 18}px`,
                }}
              >
                <span className="w-3 shrink-0 text-center">
                  {isOpen
                    ? "▾"
                    : "▸"}
                </span>

                <span className="shrink-0">
                  📁
                </span>

                <span className="min-w-0 flex-1 truncate">
                  {item.name}
                </span>
              </button>

              {isOpen &&
                item.children?.length >
                  0 && (
                  <UploadedFileTree
                    items={
                      item.children
                    }
                    level={
                      level + 1
                    }
                    onFileClick={
                      onFileClick
                    }
                    selectedPath={
                      selectedPath
                    }
                  />
                )}
            </div>
          );
        }

        /* ===================================================
           FILE
           =================================================== */

        return (
          <button
            key={item.path}
            type="button"
            onClick={() =>
              onFileClick(
                item.file
              )
            }
            className={`
              flex
              w-full
              items-center
              gap-2
              rounded-md
              px-3
              py-2
              text-left
              text-[13px]
              transition
              ${
                selectedPath ===
                item.path
                  ? "bg-[#242729] text-white"
                  : "text-[#aeb4b9] hover:bg-[#202427] hover:text-white"
              }
            `}
            style={{
              paddingLeft:
                `${30 + level * 18}px`,
            }}
            title={item.path}
          >
            <span className="shrink-0">
              📄
            </span>

            <span className="min-w-0 flex-1 truncate">
              {item.name}
            </span>

            {item.size > 0 && (
              <span className="shrink-0 text-[9px] text-[#666e74]">
                {formatFileSize(
                  item.size
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   LOCAL README
   ========================================================= */

function LocalReadme({
  file,
  projectId,
}) {
  const [content, setContent] =
    useState("Loading README...");

  useEffect(() => {
    let mounted = true;

    const loadReadme = async () => {
      if (!file) {
        setContent(
          "No README file found in this uploaded project."
        );

        return;
      }

      try {
        let value;

        /* ---------------------------------------------------
           Fresh browser upload
           --------------------------------------------------- */

        if (
          typeof file.text ===
          "function"
        ) {
          value =
            await file.text();
        }

        /* ---------------------------------------------------
           Persisted backend project
           --------------------------------------------------- */

        else {
          if (!projectId) {
            throw new Error(
              "Uploaded project ID is missing."
            );
          }

          const path =
            getUploadedFilePath(
              file
            );

          if (!path) {
            throw new Error(
              "README path is missing."
            );
          }

          value =
            await getProjectFileContent(
              projectId,
              path
            );
        }

        if (mounted) {
          setContent(
            value ||
              "README is empty."
          );
        }
      } catch (error) {
        console.error(
          "Could not read README:",
          error
        );

        if (mounted) {
          setContent(
            "Could not read README file."
          );
        }
      }
    };

    loadReadme();

    return () => {
      mounted = false;
    };
  }, [
    file,
    projectId,
  ]);

  return (
    <pre className="whitespace-pre-wrap break-words text-[13px] leading-6 text-[#bfc4c8]">
      {content}
    </pre>
  );
}

/* =========================================================
   REPOSITORY PAGE
   ========================================================= */

export default function Repository() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    owner,
    repo,
    projectId:
      uploadedRouteProjectId,
  } = useParams();

  /*
   * Uploaded projects:
   *
   * /repository/uploaded/:projectId
   *
   * GitHub repositories:
   *
   * /repository/:owner/:repo
   */

  const isUploadedRoute =
    Boolean(
      uploadedRouteProjectId
    ) ||
    owner === "uploaded";

  const isUploadedProject = isUploadedRoute;

  const routeUploadedFiles =
    Array.isArray(
      location.state?.files
    )
      ? location.state.files
      : EMPTY_FILES;



  const repositoryOwner =
    decodeURIComponent(
      owner || ""
    );

  const repositoryName =
    decodeURIComponent(
      repo || ""
    );

  /* =======================================================
     SCROLL TO TOP
     ======================================================= */

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [
    owner,
    repo,
    uploadedRouteProjectId,
  ]);

  /* =======================================================
     STATE
     ======================================================= */

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState("overview");

  const [selectedPath, setSelectedPath] =
    useState("");

  const [fileContent, setFileContent] =
    useState("");

  const [fileLoading, setFileLoading] =
    useState(false);

  const [fileError, setFileError] =
    useState("");

  const [
    localReadmeFile,
    setLocalReadmeFile,
  ] = useState(null);

  const [
    resolvedUploadedFiles,
    setResolvedUploadedFiles,
  ] = useState([]);

  const uploadedFiles =
    routeUploadedFiles.length > 0
      ? routeUploadedFiles
      : resolvedUploadedFiles;

  /* =======================================================
     LOAD REPOSITORY
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadRepository =
      async () => {
        const token =
          getToken();

        if (!token) {
          navigate(
            "/login",
            {
              replace: true,
            }
          );

          return;
        }

        /* ===================================================
           LOCAL UPLOAD
           =================================================== */

        if (isUploadedRoute) {
          if (!uploadedRouteProjectId) {
            throw new Error("Uploaded project ID is missing.");
          }

          const project = await getProject(uploadedRouteProjectId);

         const filesForProject = await getProjectFiles(uploadedRouteProjectId);

         console.log("BACKEND FILES FOR PROJECT:", filesForProject);

         if (!filesForProject.length) {
              throw new Error("This uploaded project has no files.");
         }

         setResolvedUploadedFiles(filesForProject);

          let repoSize = 0;

          const localFiles = filesForProject
            .map((file) => {

              repoSize +=file.size;

              const path = getUploadedFilePath(file);

              if (!path) return null;

              return {
                path,
                type: "blob",
                size: file.size || 0,
                file: file.path ? null : file,
              };
            })
            .filter(Boolean);

          const readmeFile = filesForProject.find((file) => {
            const path = getUploadedFilePath(file);

            const fileName =
              path
                .split("/")
                .filter(Boolean)
                .pop()
                ?.toLowerCase() || "";

            return fileName === "readme.md" || fileName === "readme.txt";
          });

          setData({
           repository: {
              name: project.name,
              full_name: project.name,
              description:
                project.description ||
                "Project uploaded from your computer.",
              html_url: null,
              language: project.language || "Unknown",
              stars: 0,
              forks: 0,
              open_issues: 0,
              size: repoSize,
              default_branch: null,
              updated_at: project.updated_at,
            },
            files: localFiles,
            commits: [],
            readme: null,
            project,
          });

          setLocalReadmeFile(readmeFile || null);

          if (readmeFile) {
            setSelectedPath(getUploadedFilePath(readmeFile));
          }

          setLoading(false);
          return;
}

        /* ===================================================
           GITHUB REPOSITORY
           =================================================== */

        if (
          !repositoryOwner ||
          !repositoryName
        ) {
          setError(
            "Invalid repository URL."
          );

          setLoading(false);

          return;
        }

        setLoading(true);
        setError("");

        try {
          const result =
            await getGitHubRepository(
              token,
              repositoryOwner,
              repositoryName
            );

          if (cancelled) {
            return;
          }

          setData(result);

          /* ---------------------------------------------
             Automatically select README
             --------------------------------------------- */

          if (
            result?.readme?.path
          ) {
            setSelectedPath(
              result.readme.path
            );
          }
        } catch (err) {
          console.error(
            "Repository loading error:",
            err
          );

          if (!cancelled) {
            if (
              err.response?.status ===
              401
            ) {
              setError(
                "GitHub authorization expired. Please reconnect GitHub."
              );
            } else {
              setError(
                err.response?.data
                  ?.detail ||
                  "Could not load repository."
              );
            }
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    loadRepository();

    return () => {
      cancelled = true;
    };
  }, [
      navigate,
      repositoryOwner,
      repositoryName,
      uploadedRouteProjectId,
      isUploadedRoute,
    ]);

  /* =======================================================
     BUILD TREE
     ======================================================= */

  const fileTree = useMemo(
    () => {
      return buildFileTree(
        data?.files || []
      );
    },
    [data]
  );

  const uploadedFileTree =
    useMemo(
      () => {
        if (
          !isUploadedProject
        ) {
          return [];
        }

        return buildUploadedFileTree(
          uploadedFiles
        );
      },
      [
        isUploadedProject,
        uploadedFiles,
      ]
    );

  /* =======================================================
     OPEN GITHUB FILE
     ======================================================= */

  const openFile = async (
    path
  ) => {
    const token =
      getToken();

    if (!token) {
      navigate(
        "/login",
        {
          replace: true,
        }
      );

      return;
    }

    setSelectedPath(path);

    setActiveTab("files");

    setFileLoading(true);

    setFileError("");

    setFileContent("");

    try {
      const result =
        await getGitHubFile(
          token,
          repositoryOwner,
          repositoryName,
          path
        );

      setFileContent(
        result?.content ||
          "No text content available."
      );
    } catch (err) {
      console.error(
        "File loading error:",
        err
      );

      if (
        err.response?.status ===
        401
      ) {
        setFileError(
          "GitHub authorization expired."
        );
      } else {
        setFileError(
          err.response?.data
            ?.detail ||
            "Could not load file."
        );
      }
    } finally {
      setFileLoading(false);
    }
  };

  /* =======================================================
     OPEN UPLOADED FILE
     ======================================================= */

  const openUploadedFile =
    async (file) => {
      try {
        const path =
          getUploadedFilePath(
            file
          );

        if (!path) {
          return;
        }

        setSelectedPath(path);

        setActiveTab("files");

        setFileLoading(true);

        setFileError("");

        setFileContent("");

        let content;

        /* -------------------------------------------------
           Fresh browser upload
           ------------------------------------------------- */

        if (
          typeof file.text ===
          "function"
        ) {
          content =
            await file.text();
        }

        /* -------------------------------------------------
           Persisted backend project
           ------------------------------------------------- */

        else {
          if (
            !uploadedRouteProjectId
          ) {
            throw new Error(
              "Uploaded project ID is missing."
            );
          }

          content =
            await getProjectFileContent(
              uploadedRouteProjectId,
              path
            );
        }

        setFileContent(
          content ||
            "No text content available."
        );
      } catch (error) {
        console.error(
          "Failed to open uploaded file:",
          error
        );

        setFileError(
          error.response?.data
            ?.detail ||
            error.message ||
            "Could not load file."
        );
      } finally {
        setFileLoading(false);
      }
    };

  /* =======================================================
     OPEN GITHUB
     ======================================================= */

  const openGitHub = () => {
    if (
      repository.html_url
    ) {
      window.open(
        repository.html_url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <RepositoryLoading
        isUploadedProject={
          isUploadedProject
        }
      />
    );
  }

  /* =======================================================
     ERROR
     ======================================================= */

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0d0f10] text-[#f2f3f4]">
        <div className="flex min-h-screen items-center justify-center px-5">
          <div className="w-full max-w-[520px] rounded-[10px] border border-[#292d30] bg-[#151819] p-8 text-center">
            <div className="text-[30px]">
              ⚠
            </div>

            <h2 className="mt-4 text-[20px] font-semibold">
              Unable to load repository
            </h2>

            <p className="mt-2 text-[13px] leading-6 text-[#858d93]">
              {error ||
                "Repository data could not be loaded."}
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/dashboard"
                  )
                }
                className="
                  rounded-[7px]
                  border
                  border-[#292d30]
                  px-4
                  py-2.5
                  text-[13px]
                  text-[#aeb4b9]
                  transition
                  hover:bg-[#1c1f21]
                  hover:text-white
                "
              >
                ← Dashboard
              </button>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="
                  rounded-[7px]
                  bg-[#ef5148]
                  px-4
                  py-2.5
                  text-[13px]
                  text-white
                  transition
                  hover:bg-[#f25a51]
                "
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     REAL REPOSITORY DATA
     ======================================================= */

  const repository = data.repository || {};

  const commits = Array.isArray(data.commits) ? data.commits : [];

  const readme = isUploadedProject ? null : data.readme || null;

  const files =
    isUploadedProject
      ? uploadedFiles
          .map((file) => {
            const path =
              getUploadedFilePath(
                file
              );

            if (!path) {
              return null;
            }

            return {
              path,
              type: "blob",
              size:
                file.size || 0,
            };
          })
          .filter(Boolean)
      : Array.isArray(
          data.files
        )
        ? data.files
        : [];

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <div className="min-h-screen bg-[#0d0f10] text-[#f2f3f4]">
      {/* =====================================================
          TOP HEADER
          ===================================================== */}

      <header
        className="
          sticky
          top-0
          z-50
          w-full
          border-b
          border-[#292d30]
          bg-[#0d0f10]/95
          backdrop-blur
        "
      >
        <div
          className="
            mx-auto
            flex
            min-h-[72px]
            w-full
            max-w-[1500px]
            items-center
            justify-between
            gap-4
            px-8
            max-[800px]:px-4
          "
        >
          {/* LEFT */}

          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="
                shrink-0
                rounded-md
                border
                border-[#292d30]
                px-3
                py-2
                text-[13px]
                text-[#969da3]
                transition
                hover:bg-[#1c1f21]
                hover:text-white
              "
            >
              ← Back
            </button>

            <div className="hidden h-7 w-px bg-[#292d30] sm:block" />

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-[18px]">
                  📁
                </span>

                <h1 className="truncate text-[18px] font-semibold">
                  {repository.name ||
                    repositoryName}
                </h1>
              </div>

              <p className="truncate text-[11px] text-[#747c82]">
                {repository.full_name ||
                  `${repositoryOwner}/${repositoryName}`}
              </p>
            </div>
          </div>

          {/* RIGHT */}

          {!isUploadedProject &&
            repository.html_url && (
              <button
                type="button"
                onClick={openGitHub}
                className="
                  shrink-0
                  whitespace-nowrap
                  rounded-md
                  border
                  border-[#292d30]
                  px-4
                  py-2
                  text-[12px]
                  text-[#aeb4b9]
                  transition
                  hover:bg-[#1c1f21]
                  hover:text-white
                  max-[600px]:px-3
                "
              >
                Open on GitHub ↗
              </button>
            )}
        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main
        className="
          mx-auto
          w-full
          max-w-[1500px]
          px-8
          py-7
          max-[800px]:px-4
        "
      >
        {/* ===================================================
            REPOSITORY HEADER
            =================================================== */}

        <section className="mb-7">
          <div className="flex items-start justify-between gap-6 max-[850px]:flex-col">
            {/* INFO */}

            <div className="min-w-0">
              {/* BADGES */}

              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#17351f] px-2.5 py-1 text-[10px] text-[#49c96d]">
                  {isUploadedProject
                    ? "● Local Upload"
                    : "● Connected"}
                </span>

                <span className="rounded-full border border-[#292d30] px-2.5 py-1 text-[10px] text-[#9ca3a9]">
                  {repository.private
                    ? "Private"
                    : "Public"}
                </span>

                {repository.language && (
                  <span className="rounded-full border border-[#292d30] px-2.5 py-1 text-[10px] text-[#9ca3a9]">
                    {
                      repository.language
                    }
                  </span>
                )}

                {repository.default_branch && (
                  <span className="rounded-full border border-[#292d30] px-2.5 py-1 text-[10px] text-[#9ca3a9]">
                    ⎇{" "}
                    {
                      repository.default_branch
                    }
                  </span>
                )}

                {repository.license && (
                  <span className="rounded-full border border-[#292d30] px-2.5 py-1 text-[10px] text-[#9ca3a9]">
                    {
                      repository.license
                    }
                  </span>
                )}
              </div>

              {/* NAME */}

              <h2 className="truncate text-[30px] font-semibold tracking-[-0.7px] max-[600px]:text-[25px]">
                {repository.name ||
                  repositoryName}
              </h2>

              {/* DESCRIPTION */}

              <p className="mt-2 max-w-[900px] text-[14px] leading-6 text-[#858d93]">
                {repository.description ||
                  "No description provided for this repository."}
              </p>

              {/* UPDATE */}

              <p className="mt-3 text-[11px] text-[#646c72]">
                Last updated{" "}
                {formatDate(
                  repository.updated_at
                )}
              </p>
            </div>

            {/* DOCUMENTATION BUTTON */}

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "documentation"
                )
              }
              className="
                shrink-0
                rounded-[7px]
                bg-[#ef5148]
                px-5
                py-3
                text-[13px]
                font-medium
                text-white
                transition
                hover:bg-[#f25a51]
              "
            >
              Generate Documentation
            </button>
          </div>
        </section>

        {/* ===================================================
            REAL STATS
            =================================================== */}

        <section className="mb-7 grid grid-cols-5 gap-4 max-[1100px]:grid-cols-3 max-[650px]:grid-cols-2">
          <div className="rounded-[9px] border border-[#292d30] bg-[#151819] p-5">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#6f777d]">
              Stars
            </p>

            <p className="mt-2 text-[22px] font-semibold">
              {repository.stars ??
                0}
            </p>
          </div>

          <div className="rounded-[9px] border border-[#292d30] bg-[#151819] p-5">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#6f777d]">
              Forks
            </p>

            <p className="mt-2 text-[22px] font-semibold">
              {repository.forks ??
                0}
            </p>
          </div>

          <div className="rounded-[9px] border border-[#292d30] bg-[#151819] p-5">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#6f777d]">
              Open Issues
            </p>

            <p className="mt-2 text-[22px] font-semibold">
              {repository.open_issues ??
                0}
            </p>
          </div>

          <div className="rounded-[9px] border border-[#292d30] bg-[#151819] p-5">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#6f777d]">
              Repository Size
            </p>

            <p className="mt-2 text-[22px] font-semibold">
              {formatFileSize(
                repository.size
              )}
            </p>
          </div>

          <div className="rounded-[9px] border border-[#292d30] bg-[#151819] p-5">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#6f777d]">
              Files
            </p>

            <p className="mt-2 text-[22px] font-semibold">
              {files.length}
            </p>
          </div>
        </section>

        {/* ===================================================
            TABS
            =================================================== */}

        <div className="mb-6 border-b border-[#292d30]">
          <div className="flex gap-8">
            {[
              "overview",
              "files",
              "documentation",
            ].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() =>
                  setActiveTab(tab)
                }
                className={`
                  relative
                  pb-3
                  text-[13px]
                  capitalize
                  transition
                  ${
                    activeTab === tab
                      ? "text-white"
                      : "text-[#777f85] hover:text-[#c8cdd1]"
                  }
                `}
              >
                {tab}

                {activeTab === tab && (
                  <span className="absolute bottom-[-1px] left-0 h-[2px] w-full bg-[#ef5148]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ===================================================
            OVERVIEW
            =================================================== */}

        {activeTab ===
          "overview" && (
          <div className="grid grid-cols-[1.55fr_1fr] gap-5 max-[1050px]:grid-cols-1">
            {/* README */}

            <section className="overflow-hidden rounded-[9px] border border-[#292d30] bg-[#151819]">
              <div className="border-b border-[#292d30] px-5 py-4">
                <h3 className="text-[15px] font-medium">
                  README
                </h3>

                <p className="mt-1 text-[11px] text-[#747c82]">
                  {isUploadedProject
                    ? "README content from the uploaded project"
                    : "Real README content from GitHub"}
                </p>
              </div>

              <div className="max-h-[620px] overflow-auto p-5">
                {isUploadedProject ? (
                  localReadmeFile ? (
                    <LocalReadme
                      file={
                        localReadmeFile
                      }
                      projectId={
                        uploadedRouteProjectId
                      }
                    />
                  ) : (
                    <div>
                      <p className="text-[13px] text-[#858d93]">
                        This uploaded project does not have a README file.
                      </p>
                    </div>
                  )
                ) : readme ? (
                  <pre className="whitespace-pre-wrap break-words text-[13px] leading-6 text-[#bfc4c8]">
                    {
                      readme.content
                    }
                  </pre>
                ) : (
                  <div>
                    <p className="text-[13px] text-[#858d93]">
                      This repository does
                      not have a README
                      file.
                    </p>

                    <p className="mt-2 text-[11px] text-[#5e666c]">
                      No README was
                      returned by the
                      GitHub API for this
                      repository.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* COMMITS */}

            <section className="overflow-hidden rounded-[9px] border border-[#292d30] bg-[#151819]">
              <div className="border-b border-[#292d30] px-5 py-4">
                <h3 className="text-[15px] font-medium">
                  Recent Commits
                </h3>

                <p className="mt-1 text-[11px] text-[#747c82]">
                  Latest commits from GitHub
                </p>
              </div>

              <div className="max-h-[620px] overflow-auto p-5">
                {commits.length ===
                0 ? (
                  <p className="text-[13px] text-[#777f85]">
                    No commits found.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {commits.map(
                      (commit) => (
                        <div
                          key={
                            commit.sha
                          }
                          className="border-b border-[#232729] pb-4 last:border-0 last:pb-0"
                        >
                          <p className="text-[13px] leading-5 text-[#d6dade]">
                            {
                              commit.message ||
                              "No commit message"
                            }
                          </p>

                          <p className="mt-1 text-[11px] text-[#747c82]">
                            {
                              commit.author ||
                              "Unknown"
                            }
                            {" • "}
                            {formatDate(
                              commit.date
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ===================================================
            FILES
            =================================================== */}

        {activeTab ===
          "files" && (
          <section className="grid grid-cols-[370px_1fr] gap-5 max-[950px]:grid-cols-1">
            {/* FILE TREE */}

            <div className="overflow-hidden rounded-[9px] border border-[#292d30] bg-[#151819]">
              <div className="border-b border-[#292d30] px-5 py-4">
                <h3 className="text-[15px] font-medium">
                  Repository Files
                </h3>

                <p className="mt-1 text-[11px] text-[#747c82]">
                  {files.length} items from{" "}
                  {
                    isUploadedProject
                      ? "local upload"
                      : "GitHub"
                  }
                </p>
              </div>

              <div className="max-h-[680px] overflow-y-auto p-3">
                {isUploadedProject ? (
                  uploadedFileTree.length >
                  0 ? (
                    <UploadedFileTree
                      items={
                        uploadedFileTree
                      }
                      onFileClick={
                        openUploadedFile
                      }
                      selectedPath={
                        selectedPath
                      }
                    />
                  ) : (
                    <p className="px-2 py-3 text-[12px] text-[#777f85]">
                      No files found in the uploaded folder.
                    </p>
                  )
                ) : fileTree.length >
                  0 ? (
                  <FileTree
                    items={fileTree}
                    onFileClick={
                      openFile
                    }
                    selectedPath={
                      selectedPath
                    }
                  />
                ) : (
                  <p className="px-2 py-3 text-[12px] text-[#777f85]">
                    No files found.
                  </p>
                )}
              </div>
            </div>

            {/* FILE CONTENT */}

            <div className="min-w-0 overflow-hidden rounded-[9px] border border-[#292d30] bg-[#101213]">
              <div className="flex min-h-[58px] items-center justify-between gap-3 border-b border-[#292d30] px-5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">
                    {selectedPath ||
                      "Select a file"}
                  </p>
                </div>

                {selectedPath && (
                  <span className="shrink-0 text-[10px] text-[#697177]">
                    {isUploadedProject
                      ? "Local Upload"
                      : "GitHub"}
                  </span>
                )}
              </div>

              <div className="max-h-[680px] overflow-auto">
                {fileLoading ? (
                  <div className="p-6 text-[13px] text-[#7b8389]">
                    {isUploadedProject
                      ? "Reading local file..."
                      : "Loading file from GitHub..."}
                  </div>
                ) : fileError ? (
                  <div className="p-6">
                    <p className="text-[13px] text-[#ef756d]">
                      {fileError}
                    </p>
                  </div>
                ) : selectedPath ? (
                  <pre className="overflow-x-auto p-5 text-[12px] leading-6 text-[#c1c6ca]">
                    <code>
                      {
                        fileContent
                      }
                    </code>
                  </pre>
                ) : (
                  <div className="p-6 text-[13px] text-[#777f85]">
                    Select a file from
                    the repository tree.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ===================================================
            DOCUMENTATION
            =================================================== */}

        {activeTab ===
          "documentation" && (
          <section className="rounded-[9px] border border-[#292d30] bg-[#151819] p-7">
            <div className="max-w-[900px]">
              <span className="rounded-full bg-[#34201e] px-2.5 py-1 text-[10px] text-[#ef756d]">
                AI DOCUMENTATION
              </span>

              <h3 className="mt-4 text-[23px] font-semibold">
                Generate documentation
                for{" "}
                {repository.name ||
                  repositoryName}
              </h3>

              <p className="mt-2 text-[13px] leading-6 text-[#838b91]">
                {isUploadedProject
                  ? "This project was uploaded from your computer. Its files are available locally for analysis and documentation generation."
                  : "This repository is connected directly to GitHub. Repository metadata, files, README and commits are loaded from the connected GitHub account."}
              </p>

              {/* REAL REPOSITORY INFO */}

              <div className="mt-7 grid grid-cols-3 gap-4 max-[750px]:grid-cols-1">
                <div className="rounded-lg border border-[#292d30] bg-[#111314] p-5">
                  <p className="text-[11px] text-[#737b81]">
                    Repository
                  </p>

                  <p className="mt-2 truncate text-[15px] font-medium">
                    {repository.full_name ||
                      repositoryName}
                  </p>
                </div>

                <div className="rounded-lg border border-[#292d30] bg-[#111314] p-5">
                  <p className="text-[11px] text-[#737b81]">
                    Files Available
                  </p>

                  <p className="mt-2 text-[20px] font-semibold">
                    {files.length}
                  </p>
                </div>

                <div className="rounded-lg border border-[#292d30] bg-[#111314] p-5">
                  <p className="text-[11px] text-[#737b81]">
                    Default Branch
                  </p>

                  <p className="mt-2 truncate text-[15px] font-medium">
                    {isUploadedProject
                      ? "Local Upload"
                      : repository.default_branch ||
                        "—"}
                  </p>
                </div>
              </div>

              {/* ACTION */}

              <button
                type="button"
                onClick={() => {
                  if (isUploadedProject) {
                    navigate(
                      `/docpilot?projectId=${encodeURIComponent(
                        uploadedRouteProjectId
                      )}`
                    );
                    return;
                  }
                  navigate("/docpilot", {
                    state: {
                      repositoryOwner,
                      repositoryName,
                    },
                  });
                }}
                className="
                  mt-7
                  rounded-[7px]
                  bg-[#ef5148]
                  px-5
                  py-3
                  text-[13px]
                  font-medium
                  text-white
                  transition
                  hover:bg-[#f25a51]
                "
              >
                Generate Documentation
              </button>

              <p className="mt-3 text-[11px] text-[#60686e]">
              Documentation will be generated from the
              project files stored on the server.
            </p>

            </div>

          </section>
        )}
      </main>
    </div>
  );
}