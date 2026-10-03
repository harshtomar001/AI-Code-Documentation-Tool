import { useNavigate } from "react-router-dom";
import { useEngine } from "../../hooks/useEngine.js";
import { getToken } from "../../../../utils/getToken.js";
import Icon from "../common/Icon.jsx";
import "./JobFailedCard.css";

export default function JobFailedCard() {
  const engine = useEngine();
  const navigate = useNavigate();

  const handleRetry = () => {
    if (engine.projectId) {
      engine.startProjectJob(
        engine.projectId,
        engine.repositoryName || "repository",
        getToken()
      );
    }
  };

  const handleBack = () => {
    if (engine.projectId) {
      navigate(`/repository/uploaded/${encodeURIComponent(engine.projectId)}`);
    } else {
      navigate("/dashboard");
    }
  };

  const errorMessage =
    engine.jobError ||
    "An error occurred during Core AI pipeline processing.";

  const failedStage = "AI Generation";
  const batchInfo =
    engine.totalBatches > 0
      ? `Batch ${engine.batches.length} of ${engine.totalBatches}`
      : "Batch setup";

  return (
    <div className="job-failed-card" role="alert">
      <div className="job-failed-card__header">
        <div className="job-failed-card__icon">
          <Icon name="x" size={24} stroke={2.4} />
        </div>
        <div className="job-failed-card__text">
          <h3 className="job-failed-card__title">Documentation Job Failed</h3>
          <p className="job-failed-card__sub">
            The documentation pipeline encountered an issue and could not finish.
          </p>
        </div>
      </div>

      <div className="job-failed-card__details">
        <div className="failed-meta-item">
          <span className="failed-meta-item__label">Stage</span>
          <span className="failed-meta-item__val">{failedStage}</span>
        </div>
        <div className="failed-meta-item">
          <span className="failed-meta-item__label">Progress</span>
          <span className="failed-meta-item__val">{batchInfo}</span>
        </div>
        <div className="failed-meta-item failed-meta-item--msg">
          <span className="failed-meta-item__label">Error Message</span>
          <span className="failed-meta-item__val">{errorMessage}</span>
        </div>
      </div>

      <div className="job-failed-card__actions">
        <button
          type="button"
          className="btn btn--accent"
          onClick={handleRetry}
        >
          Retry Documentation
        </button>

        <button
          type="button"
          className="btn btn--outline"
          onClick={handleBack}
        >
          Back to Repository
        </button>
      </div>
    </div>
  );
}
