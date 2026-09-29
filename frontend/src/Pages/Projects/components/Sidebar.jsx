import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  History,
  Settings,
} from "lucide-react";

export default function Sidebar({ currentPage = "Projects", onNavigate = () => {} }) {
  const items = [
    ["Dashboard", LayoutDashboard],
    ["Projects", FolderOpen],
    ["Documentation", FileText],
    ["History", History],
    ["Settings", Settings],
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">▣</div>
        <span>
          DocuAI<span className="brand-dot">.</span>
        </span>
      </div>

      <nav className="nav-list">
        {items.map(([label, Icon]) => (
          <button
            key={label}
            className={`nav-item ${currentPage === label ? "active" : ""}`}
            onClick={() => onNavigate(label)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="github-section">
        <div className="github-heading">
          <span>GITHUB</span>
        </div>

        <div className="github-placeholder">
          <span className="status-dot" />
          Connected through Dashboard
        </div>

        <div className="repo-heading">PROJECT PAGE</div>
        <p className="sidebar-note">
          Use the Dashboard sidebar to import or upload a project.
        </p>
      </div>
    </aside>
  );
}
