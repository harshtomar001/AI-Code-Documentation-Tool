import ProjectCard from "./ProjectCard";

export default function ProjectGrid({
  projects,
  view,
  menuId,
  onToggleMenu,
  onOpen,
  onDuplicate,
  onDelete,
}) {
  return (
    <div className={`project-grid ${view === "list" ? "list-view" : ""}`}>
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          menuOpen={menuId === project.id}
          onToggleMenu={onToggleMenu}
          onOpen={onOpen}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
