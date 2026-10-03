export default function ProjectMenu({
  project,
  darkMode,
  onOpen,
  onViewDocumentation,
  onGenerate,
  onSettings,
  onDelete,
}) {
  const menu = darkMode
    ? "bg-[#161819] border-[#292d30] text-[#f2f3f4]"
    : "bg-white border-[#dfe2e5] text-[#17191c]";

  const hover = darkMode
    ? "hover:bg-[#222628]"
    : "hover:bg-[#f2f3f4]";

  return (
    <div
      className={`absolute right-0 top-9 z-50 w-[190px] overflow-hidden rounded-lg border shadow-lg ${menu}`}
    >
      <button
        type="button"
        onClick={() => onOpen(project)}
        className={`block w-full px-3 py-2.5 text-left text-xs ${hover}`}
      >
        Open Project
      </button>

      <button
        type="button"
        onClick={() => onViewDocumentation(project)}
        className={`block w-full px-3 py-2.5 text-left text-xs ${hover}`}
      >
        View Documentation
      </button>

      <button
        type="button"
        onClick={() => onGenerate(project)}
        className={`block w-full px-3 py-2.5 text-left text-xs ${hover}`}
      >
        Generate Documentation
      </button>

      <button
        type="button"
        onClick={() => onSettings(project)}
        className={`block w-full px-3 py-2.5 text-left text-xs ${hover}`}
      >
        Project Settings
      </button>

      <div
        className={
          darkMode
            ? "border-t border-[#292d30]"
            : "border-t border-[#e8eaec]"
        }
      />

      <button
        type="button"
        onClick={() => onDelete(project)}
        className="block w-full px-3 py-2.5 text-left text-xs text-[#ef5148] hover:bg-[#ef5148]/10"
      >
        Delete Project
      </button>
    </div>
  );
}