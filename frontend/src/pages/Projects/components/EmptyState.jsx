import { FolderOpen } from "lucide-react";

export default function EmptyState({ onClear }) {
  return (
    <div className="empty-state">
      <FolderOpen size={38} />
      <h2>No projects found</h2>
      <p>Try changing the filter or search term.</p>
      <button onClick={onClear}>Clear filters</button>
    </div>
  );
}
