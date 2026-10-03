import { useEffect, useRef, useState } from "react";

export default function RecentProjects({
  projects,
  darkMode,
  loading = false,
  onOpenProject,
  onViewDocumentation,
  onGenerateDocumentation,
  onProjectSettings,
  onDeleteProject,
  onViewAll,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [deleteProject, setDeleteProject] = useState(null);

  const menuRef = useRef(null);

  const border = darkMode
    ? "border-[#292d30]"
    : "border-[#dfe2e5]";

  const softBorder = darkMode
    ? "border-[#222628]"
    : "border-[#e8eaec]";

  const panel = darkMode
    ? "bg-[#111314]"
    : "bg-white";

  const hoverPanel = darkMode
    ? "bg-[#161819]"
    : "bg-[#f2f3f4]";

  const text = darkMode
    ? "text-[#f2f3f4]"
    : "text-[#17191c]";

  const secondary = darkMode
    ? "text-[#9fa5ab]"
    : "text-[#5d6369]";

  const progressColors = [
    "bg-[#348ff2]",
    "bg-[#f6c344]",
    "bg-[#36c989]",
  ];

  // Close the project menu when clicking outside,
  // resizing the window, or scrolling.
  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    const closeMenu = () => {
      setOpenMenuId(null);
      setMenuPosition(null);
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    window.addEventListener("resize", closeMenu);

    window.addEventListener(
      "scroll",
      closeMenu,
      true
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      window.removeEventListener(
        "resize",
        closeMenu
      );

      window.removeEventListener(
        "scroll",
        closeMenu,
        true
      );
    };
  }, [openMenuId]);

  const handleMenuToggle = (event, projectId) => {
    event.stopPropagation();

    if (openMenuId === projectId) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const buttonRect =
      event.currentTarget.getBoundingClientRect();

    const menuWidth = 190;
    const menuHeight = 220;
    const spacing = 6;

    let left =
      buttonRect.right - menuWidth;

    let top =
      buttonRect.bottom + spacing;

    // Keep menu inside viewport horizontally.
    if (left < 8) {
      left = 8;
    }

    if (
      left + menuWidth >
      window.innerWidth - 8
    ) {
      left =
        window.innerWidth -
        menuWidth -
        8;
    }

    // Open above the button if there
    // isn't enough space below it.
    if (
      top + menuHeight >
      window.innerHeight - 8
    ) {
      top =
        buttonRect.top -
        menuHeight -
        spacing;
    }

    // Final vertical safety check.
    if (top < 8) {
      top = 8;
    }

    setMenuPosition({
      top,
      left,
    });

    setOpenMenuId(projectId);
  };

  const handleDeleteClick = (event, project) => {
    event.stopPropagation();

    setOpenMenuId(null);
    setMenuPosition(null);
    setDeleteProject(project);
  };

  const handleConfirmDelete = () => {
    if (!deleteProject) {
      return;
    }

    onDeleteProject?.(deleteProject);

    setDeleteProject(null);
  };

  return (
    <>
      {/* Recent Projects Card */}
      <div
        className={`overflow-hidden rounded-lg border ${border} ${panel}`}
      >
        <div
          className={`flex min-h-[46px] items-center justify-between border-b px-[17px] ${softBorder}`}
        >
          <h2
            className={`text-base font-semibold ${text}`}
          >
            Recent Projects
          </h2>

          <button
            type="button"
            className={`bg-transparent text-xs ${secondary}`}
            onClick={onViewAll}
          >
            View All →
          </button>
        </div>

        {loading ? (
          <div
            className={`px-[17px] py-8 text-sm ${secondary}`}
          >
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div
            className={`px-[17px] py-8 text-sm ${secondary}`}
          >
            No projects yet. Import or upload a project
            to get started.
          </div>
        ) : (
          projects.map((project, index) => (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                onOpenProject?.(project)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();

                  onOpenProject?.(project);
                }
              }}
              className={`relative flex min-h-[73px] cursor-pointer items-center border-b px-[17px] py-2 last:border-b-0 ${softBorder} ${
                darkMode
                  ? "hover:bg-[#161819]"
                  : "hover:bg-[#f8f9fa]"
              }`}
            >
              {/* Project Icon */}
              <div
                className={`mr-[22px] flex h-[58px] w-[61px] shrink-0 items-center justify-center rounded-[9px] border text-[25px] ${border} ${hoverPanel}`}
              >
                📁
              </div>

              {/* Project Name + Tags */}
              <div className="min-w-[180px]">
                <h3
                  className={`truncate text-sm ${text}`}
                  title={project.name}
                >
                  {project.name}
                </h3>

                <div className="mt-[7px] flex gap-[7px]">
                  {(project.tags || ["Project"]).map(
                    (tag) => (
                      <span
                        key={tag}
                        className={`rounded-[5px] px-2 py-1 text-[10px] ${
                          darkMode
                            ? "bg-[#222528] text-[#b4bac0]"
                            : "bg-[#e9ebed] text-[#5d6369]"
                        }`}
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="ml-5 flex flex-1 items-center gap-4">
                <div
                  className={`h-[9px] w-[115px] overflow-hidden rounded-full ${
                    darkMode
                      ? "bg-[#272a2d]"
                      : "bg-[#dfe2e5]"
                  }`}
                >
                  <div
                    className={`h-full rounded-full ${
                      progressColors[
                        index %
                          progressColors.length
                      ]
                    }`}
                    style={{
                      width: `${project.progress || 0}%`,
                    }}
                  />
                </div>

                <span
                  className={`text-xs ${text}`}
                >
                  {project.progress || 0}%
                </span>
              </div>

              {/* Open Project */}
              <button
                type="button"
                aria-label={`Open ${project.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProject?.(project);
                }}
                className="bg-transparent px-1 text-[22px] text-[#92989e]"
              >
                ›
              </button>

              {/* Project Options */}
              <button
                type="button"
                aria-label={`Options for ${project.name}`}
                aria-expanded={
                  openMenuId === project.id
                }
                onClick={(event) =>
                  handleMenuToggle(
                    event,
                    project.id
                  )
                }
                className={`ml-[13px] rounded-md bg-transparent px-1 text-[22px] text-[#92989e] ${
                  darkMode
                    ? "hover:bg-[#222628]"
                    : "hover:bg-[#f2f3f4]"
                }`}
              >
                ⋮
              </button>
            </div>
          ))
        )}
      </div>

      {/* Project Options Popup */}
      {openMenuId &&
        menuPosition &&
        (() => {
          const project = projects.find(
            (item) => item.id === openMenuId
          );

          if (!project) {
            return null;
          }

          return (
            <div
              ref={menuRef}
              className={`fixed z-[9999] w-[190px] overflow-hidden rounded-lg border shadow-xl ${border} ${panel}`}
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
              onWheel={(event) =>
                event.stopPropagation()
              }
            >
              {/* Open Project */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuPosition(null);

                  onOpenProject?.(project);
                }}
                className={`block w-full px-3 py-2.5 text-left text-xs ${text} ${
                  darkMode
                    ? "hover:bg-[#222628]"
                    : "hover:bg-[#f2f3f4]"
                }`}
              >
                Open Project
              </button>

              {/* View Documentation */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuPosition(null);

                  onViewDocumentation?.(
                    project
                  );
                }}
                className={`block w-full px-3 py-2.5 text-left text-xs ${text} ${
                  darkMode
                    ? "hover:bg-[#222628]"
                    : "hover:bg-[#f2f3f4]"
                }`}
              >
                View Documentation
              </button>

              {/* Generate Documentation */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuPosition(null);

                  onGenerateDocumentation?.(
                    project
                  );
                }}
                className={`block w-full px-3 py-2.5 text-left text-xs ${text} ${
                  darkMode
                    ? "hover:bg-[#222628]"
                    : "hover:bg-[#f2f3f4]"
                }`}
              >
                Generate Documentation
              </button>

              {/* Project Settings */}
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  setMenuPosition(null);

                  onProjectSettings?.(
                    project
                  );
                }}
                className={`block w-full px-3 py-2.5 text-left text-xs ${text} ${
                  darkMode
                    ? "hover:bg-[#222628]"
                    : "hover:bg-[#f2f3f4]"
                }`}
              >
                Project Settings
              </button>

              {/* Separator */}
              <div
                className={`border-t ${softBorder}`}
              />

              {/* Delete Project */}
              <button
                type="button"
                onClick={(event) =>
                  handleDeleteClick(
                    event,
                    project
                  )
                }
                className="block w-full px-3 py-2.5 text-left text-xs text-[#ef5148] hover:bg-[#ef5148]/10"
              >
                Delete Project
              </button>
            </div>
          );
        })()}

      {/* Delete Confirmation Modal */}
      {deleteProject && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4"
          onClick={() =>
            setDeleteProject(null)
          }
        >
          <div
            className={`w-full max-w-[400px] rounded-xl border p-5 shadow-2xl ${border} ${panel}`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h3
              className={`text-base font-semibold ${text}`}
            >
              Delete project?
            </h3>

            <p
              className={`mt-2 text-sm leading-5 ${secondary}`}
            >
              Are you sure you want to delete{" "}
              <strong className={text}>
                {deleteProject.name}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              {/* Cancel */}
              <button
                type="button"
                onClick={() =>
                  setDeleteProject(null)
                }
                className={`rounded-md border px-4 py-2 text-xs ${border} ${text} ${
                  darkMode
                    ? "hover:bg-[#222628]"
                    : "hover:bg-[#f2f3f4]"
                }`}
              >
                Cancel
              </button>

              {/* Confirm Delete */}
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-md bg-[#ef5148] px-4 py-2 text-xs font-medium text-white hover:bg-[#d9433b]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}