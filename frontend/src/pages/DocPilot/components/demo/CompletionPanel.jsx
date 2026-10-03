import { useNavigate } from "react-router-dom";
import { useEngine } from "../../hooks/useEngine.js";
import { changesIn } from "../../engine/helpers.js";
import Icon from "../common/Icon.jsx";
import BatchList from "./BatchList.jsx";
import "./CompletionPanel.css";

export default function CompletionPanel() {
  const engine = useEngine();
  const navigate = useNavigate();

  const batches = engine.batches || [];
  const uniqueFiles = new Set();
  let totalChanges = 0;
  let hasReadme = false;

  for (const b of batches) {
    if (b.readme) hasReadme = true;
    for (const f of b.files || []) {
      uniqueFiles.add(f.name);
    }
    totalChanges += changesIn(b);
  }

  const filesCount = uniqueFiles.size;
  const readmeCount = hasReadme ? 1 : 0;
  const batchesCount = batches.length || engine.totalBatches || 0;

  const handleReview = () => {
    if (batches.length > 0) {
      engine.openModal(0);
    }
  };

  const handleDownload = () => {
    engine.downloadZip();
  };

  const handleBack = () => {
    if (engine.projectId) {
      navigate(`/repository/uploaded/${encodeURIComponent(engine.projectId)}`);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="completion-panel" aria-label="Documentation complete">
      <div className="completion-card">
        <div className="completion-card__hero">
          <div className="completion-card__badge">
            <Icon name="check" size={28} stroke={3} />
          </div>
          <div className="completion-card__header-text">
            <h2 className="completion-card__title">
              Documentation Complete <span className="completion-card__check">✓</span>
            </h2>
            <p className="completion-card__subtitle">
              All documentation batches have been generated and verified. Your repository is ready for review and download.
            </p>
          </div>
        </div>

        <div className="completion-metrics">
          <div className="metric-box">
            <span className="metric-box__value">{filesCount}</span>
            <span className="metric-box__label">Files Analyzed</span>
          </div>

          <div className="metric-box">
            <span className="metric-box__value metric-box__value--accent">{totalChanges}</span>
            <span className="metric-box__label">Documentation Changes</span>
          </div>

          <div className="metric-box">
            <span className="metric-box__value metric-box__value--success">
              {readmeCount > 0 ? "Generated" : "None"}
            </span>
            <span className="metric-box__label">README</span>
          </div>

          <div className="metric-box">
            <span className="metric-box__value">{batchesCount}</span>
            <span className="metric-box__label">Batches Processed</span>
          </div>
        </div>

        <div className="completion-actions">
          <button
            type="button"
            className="btn btn--accent btn--lg"
            onClick={handleReview}
          >
            Review Documentation
          </button>

          <button
            type="button"
            className="btn btn--outline btn--lg"
            onClick={handleDownload}
          >
            Download ZIP
          </button>

          <button
            type="button"
            className="btn btn--ghost btn--lg"
            onClick={handleBack}
          >
            Back to Repository
          </button>
        </div>
      </div>

      <div className="completion-batches">
        <div className="completion-batches__head">
          <h3>Generated Batches ({batches.length})</h3>
          <span className="completion-batches__hint">Click Review Batch to inspect changes and generated docstrings</span>
        </div>
        <BatchList />
      </div>
    </div>
  );
}
