import { useState } from "react";
import { X } from "lucide-react";

export default function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("manual");

  const submit = async (event) => {
    event.preventDefault();

    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanDescription = description.trim();

    if (!cleanName) return;

    await onCreate({
      name: cleanName,
      description: cleanDescription || "New documentation project.",
      source_type: sourceType,
    });
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <h2>New Project</h2>
            <p>Create a project to start documenting your code.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>

        <label>
          Project name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Student ERP"
          />
        </label>

        <label>
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
          />
        </label>

        <label>
          Source type
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
          >
            <option value="manual">Manual</option>
            <option value="github">GitHub</option>
            <option value="upload">Upload</option>
          </select>
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
