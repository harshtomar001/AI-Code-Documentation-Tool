import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  disconnectGitHub,
  getGitHubConnectUrl,
  getGitHubRepositories,
  getGitHubStatus,
} from "../../../api/github";

const navItems = [
  ["Dashboard", "⌂"],
  ["Projects", "▱"],
  ["Documentation", "▤"],
  ["History", "◷"],
  ["Settings", "⚙"],
];

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

export default function Sidebar({
  activeMenu,
  onMenuChange,
  darkMode,
  onNotify,
}) {
  const navigate = useNavigate();

  /* =========================================================
     GITHUB STATE
     ========================================================= */

  const [github, setGithub] = useState({
    connected: false,
    username: null,
    repositories: [],
    loading: true,
  });

  const [showAll, setShowAll] = useState(false);
  const [connecting, setConnecting] = useState(false);

  /* =========================================================
     GITHUB STATUS + REPOSITORY LOADING
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchGitHubData = async () => {
      const token = getToken();

      /* -------------------------------------------------------
         NO TOKEN
         ------------------------------------------------------- */

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
        /* -----------------------------------------------------
           GET GITHUB STATUS
           ----------------------------------------------------- */

        const status = await getGitHubStatus(token);

        if (cancelled) {
          return;
        }

        /* -----------------------------------------------------
           GITHUB NOT CONNECTED
           ----------------------------------------------------- */

        if (!status.connected) {
          setGithub({
            connected: false,
            username: null,
            repositories: [],
            loading: false,
          });

          return;
        }

        /* -----------------------------------------------------
           GITHUB CONNECTED
           GET REPOSITORIES
           ----------------------------------------------------- */

        const result = await getGitHubRepositories(token);

        if (cancelled) {
          return;
        }

        setGithub({
          connected: true,
          username: status.username || null,
          repositories: result.repositories || [],
          loading: false,
        });
      } catch (error) {
        console.error(
          "GitHub sidebar error:",
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

    fetchGitHubData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     CONNECT GITHUB
     ========================================================= */

  const connectGitHub = async () => {
    const token = getToken();

    if (!token) {
      onNotify?.("Please login first");
      return;
    }

    try {
      setConnecting(true);

      const url = await getGitHubConnectUrl(token);

      /*
       * Redirect browser to GitHub OAuth
       */
      window.location.href = url;
    } catch (error) {
      console.error(
        "GitHub connect error:",
        error
      );

      onNotify?.(
        error.response?.data?.detail ||
          "Could not connect GitHub"
      );

      setConnecting(false);
    }
  };

  /* =========================================================
     DISCONNECT GITHUB
     ========================================================= */

  const handleDisconnect = async () => {
    const token = getToken();

    if (!token) {
      onNotify?.("Please login first");
      return;
    }

    try {
      await disconnectGitHub(token);

      setGithub({
        connected: false,
        username: null,
        repositories: [],
        loading: false,
      });

      setShowAll(false);

      onNotify?.("GitHub disconnected");
    } catch (error) {
      console.error(
        "GitHub disconnect error:",
        error
      );

      onNotify?.(
        error.response?.data?.detail ||
          "Could not disconnect GitHub"
      );
    }
  };

  /* =========================================================
     OPEN REPOSITORY
     ========================================================= */

  const openRepository = (repo) => {
    /*
     * Prefer the owner returned by the backend.
     * If it is missing, extract it from full_name.
     * Finally fall back to the connected GitHub username.
     */
    const fullNameParts = (repo.full_name || "").split("/");

    const owner =
      repo.owner ||
      fullNameParts[0] ||
      github.username;

    const repositoryName =
      repo.name ||
      fullNameParts[1];

    if (!owner || !repositoryName) {
      console.error(
        "Invalid GitHub repository data:",
        repo
      );

      onNotify?.(
        "Repository information is incomplete"
      );
      return;
    }

    navigate(
      `/repository/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(
        repositoryName
      )}`
    );
  };

  /* =========================================================
     THEME CLASSES
     ========================================================= */

  const text = darkMode
    ? "text-[#9fa5ab]"
    : "text-[#5d6369]";

  const active = darkMode
    ? "bg-[#242729] text-white"
    : "bg-[#e9ebed] text-[#151719]";

  const hover = darkMode
    ? "hover:bg-[#161819] hover:text-[#f2f3f4]"
    : "hover:bg-[#f2f3f4] hover:text-[#17191c]";

  const panel = darkMode
    ? "border-[#292d30] bg-[#111315]"
    : "border-[#e1e4e7] bg-[#f8f9fa]";

  /* =========================================================
     VISIBLE REPOSITORIES
     ========================================================= */

  const visibleRepositories = showAll
    ? github.repositories
    : github.repositories.slice(0, 5);

  /* =========================================================
     UI
     ========================================================= */

  return (
    <aside
      className={`
        fixed
        inset-y-0
        left-0
        z-10
        flex
        w-[250px]
        flex-col
        border-r
        max-[850px]:w-[210px]
        max-[700px]:hidden
        ${
          darkMode
            ? "border-[#292d30] bg-[#0d0f10]"
            : "border-[#dfe2e5] bg-white"
        }
      `}
    >
      {/* =====================================================
          LOGO
          ===================================================== */}

      <div
        className={`
          flex
          h-20
          shrink-0
          items-center
          border-b
          px-10
          text-2xl
          font-semibold
          ${
            darkMode
              ? "border-[#222628]"
              : "border-[#e8eaec]"
          }
        `}
      >
        <div className="mr-[15px] text-[25px]">
          ▣
        </div>

        <span>
          DocuAI
          <span className="text-[#ef5148]">
            .
          </span>
        </span>
      </div>

      {/* =====================================================
          NAVIGATION
          ===================================================== */}

      <nav className="p-[18px]">
        {navItems.map(([item, icon]) => (
          <button
            key={item}
            type="button"
            className={`
              mb-[5px]
              flex
              h-[51px]
              w-full
              items-center
              gap-5
              rounded-[7px]
              px-[23px]
              text-left
              text-[15px]
              transition
              ${
                activeMenu === item
                  ? active
                  : `${text} ${hover}`
              }
            `}
            onClick={() =>
              onMenuChange(item)
            }
          >
            <span className="w-[23px] text-center text-[21px]">
              {icon}
            </span>

            {item}
          </button>
        ))}
      </nav>

      {/* =====================================================
          GITHUB SECTION
          ===================================================== */}

      <div className="min-h-0 flex-1 px-[18px] pb-5">
        {/* -----------------------------------------------------
            GITHUB HEADER
            ----------------------------------------------------- */}

        <div className="mb-2 flex items-center justify-between px-2">
          <span
            className={`
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.08em]
              ${
                darkMode
                  ? "text-[#777e84]"
                  : "text-[#7b8288]"
              }
            `}
          >
            GitHub
          </span>

          {github.connected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className={`
                text-[10px]
                ${
                  darkMode
                    ? "text-[#777e84] hover:text-white"
                    : "text-[#8a9096] hover:text-black"
                }
              `}
            >
              Disconnect
            </button>
          )}
        </div>

        {/* =====================================================
            GITHUB NOT CONNECTED
            ===================================================== */}

        {!github.loading &&
          !github.connected && (
            <div
              className={`
                rounded-[8px]
                border
                p-3
                ${panel}
              `}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[18px]">
                  ◉
                </span>

                <span className="text-[13px] font-semibold">
                  GitHub
                </span>
              </div>

              <p
                className={`
                  mb-3
                  text-[11px]
                  leading-[1.45]
                  ${
                    darkMode
                      ? "text-[#92999f]"
                      : "text-[#697078]"
                  }
                `}
              >
                Connect GitHub to import
                repositories.
              </p>

              <button
                type="button"
                disabled={connecting}
                onClick={connectGitHub}
                className="
                  w-full
                  rounded-[6px]
                  bg-[#ef5148]
                  px-2
                  py-2
                  text-[11px]
                  font-medium
                  text-white
                  transition
                  hover:bg-[#f25a51]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {connecting
                  ? "Connecting..."
                  : "Connect GitHub"}
              </button>
            </div>
          )}

        {/* =====================================================
            GITHUB LOADING
            ===================================================== */}

        {github.loading && (
          <div
            className={`
              px-2
              py-3
              text-[11px]
              ${
                darkMode
                  ? "text-[#777e84]"
                  : "text-[#7b8288]"
              }
            `}
          >
            Loading repositories...
          </div>
        )}

        {/* =====================================================
            GITHUB CONNECTED
            ===================================================== */}

        {github.connected &&
          !github.loading && (
            <div
              className={`
                rounded-[8px]
                border
                p-2
                ${panel}
              `}
            >
              {/* ------------------------------------------------
                  USERNAME
                  ------------------------------------------------ */}

              <div className="mb-2 flex items-center gap-2 px-1.5">
                <span className="h-2 w-2 rounded-full bg-[#3fb950]" />

                <span
                  className={`
                    truncate
                    text-[11px]
                    ${
                      darkMode
                        ? "text-[#c7ccd0]"
                        : "text-[#4d555b]"
                    }
                  `}
                >
                  {github.username}
                </span>
              </div>

              {/* ------------------------------------------------
                  REPOSITORY HEADING
                  ------------------------------------------------ */}

              <div
                className={`
                  mb-1
                  px-1.5
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.06em]
                  ${
                    darkMode
                      ? "text-[#777e84]"
                      : "text-[#7b8288]"
                  }
                `}
              >
                Repositories
              </div>

              {/* =================================================
                  NO REPOSITORIES
                  ================================================= */}

              {github.repositories.length === 0 ? (
                <div
                  className={`
                    px-1.5
                    py-2
                    text-[11px]
                    ${
                      darkMode
                        ? "text-[#777e84]"
                        : "text-[#7b8288]"
                    }
                  `}
                >
                  No repositories found.
                </div>
              ) : (
                /* =================================================
                   REPOSITORIES
                   ================================================= */

                <div className="max-h-[235px] space-y-0.5 overflow-y-auto pr-1">
                  {visibleRepositories.map(
                    (repo) => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() =>
                          openRepository(repo)
                        }
                        title={repo.full_name}
                        className={`
                          flex
                          w-full
                          items-center
                          gap-2
                          rounded-[5px]
                          px-1.5
                          py-[7px]
                          text-left
                          text-[11px]
                          transition
                          ${
                            darkMode
                              ? "text-[#aeb4b9] hover:bg-[#1d2022] hover:text-white"
                              : "text-[#60676d] hover:bg-[#eceeef] hover:text-[#17191c]"
                          }
                        `}
                      >
                        {/* Folder Icon */}

                        <span className="shrink-0 text-[12px]">
                          📁
                        </span>

                        {/* Repository Name */}

                        <span className="min-w-0 flex-1 truncate">
                          {repo.name}
                        </span>

                        {/* Private Badge */}

                        {repo.private && (
                          <span className="shrink-0 text-[9px] opacity-60">
                            Private
                          </span>
                        )}
                      </button>
                    )
                  )}
                </div>
              )}

              {/* =================================================
                  VIEW ALL / SHOW LESS
                  ================================================= */}

              {github.repositories.length > 5 && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAll(
                      (value) => !value
                    )
                  }
                  className={`
                    mt-2
                    w-full
                    px-1.5
                    text-left
                    text-[10px]
                    font-medium
                    ${
                      darkMode
                        ? "text-[#ef5148] hover:text-[#ff6b62]"
                        : "text-[#d83f37] hover:text-[#ef5148]"
                    }
                  `}
                >
                  {showAll
                    ? "Show less"
                    : `View all ${github.repositories.length} repositories →`}
                </button>
              )}
            </div>
          )}
      </div>
    </aside>
  );
}