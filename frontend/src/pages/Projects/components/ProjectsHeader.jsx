export default function ProjectsHeader({ onNewProject }) {
  return (
    <div className="projects-heading">
      <div>
        <h1>Projects</h1>
        <p>Manage and track all your documentation projects.</p>
      </div>

      <button className="new-project-button" onClick={onNewProject}>
        + New Project
      </button>
    </div>
  );
}
