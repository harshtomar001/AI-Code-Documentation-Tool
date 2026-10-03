import {
  Folder,
  FileText,
  MessageCircle,
  MoreVertical,
} from "lucide-react";

export default function ProjectCard({
  project,
  menuOpen,
  onToggleMenu,
  onOpen,
  onDuplicate,
  onDelete,
}) {
  return (
    <article className="project-card">
      <div className="card-top">
        <button
          className={`folder-icon ${project.color}`}
          onClick={() => onOpen(project)}
          aria-label={`Open ${project.name}`}
        >
          <Folder size={24} fill="currentColor" />
        </button>

        <div className="menu-wrap">
          <button
            className="more-button"
            onClick={() => onToggleMenu(project.id)}
            aria-label="Project options"
          >
            <MoreVertical size={19} />
          </button>

          {menuOpen && (
            <div className="project-menu">
              <button onClick={() => onOpen(project)}>Open project</button>
              <button onClick={() => onDuplicate(project)}>Duplicate</button>
              <button
                className="danger"
                onClick={() => onDelete(project.id)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <button className="card-main" onClick={() => onOpen(project)}>
        <h2>{project.name}</h2>
        <p>{project.description}</p>

        <div className="tags">
          {(project.tags || []).map((tag, index) => (
            <span key={`${tag}-${index}`}>{tag}</span>
          ))}
          {project.source_type && (
            <span>{project.source_type}</span>
          )}
        </div>
      </button>

      <div className="progress-row">
        <div className="progress-track">
          <div
            className={`progress-fill ${project.progress === 100 ? "complete" : ""}`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <strong>{project.progress}%</strong>
      </div>

      <div className="card-meta">
        <span>
          <FileText size={15} /> {project.docs} docs
        </span>
        <span>
          <MessageCircle size={15} /> {project.comments} comments
        </span>
        <span>{project.updated}</span>
      </div>
    </article>
  );
}
