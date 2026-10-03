import { useNavigate } from 'react-router-dom';
import { useEngine } from '../../hooks/useEngine.js';
import { REPO } from '../../data/constants.js';
import { fmtN } from '../../utils/format.js';
import Icon, { GithubMark } from '../common/Icon.jsx';
import Switch from '../common/Switch.jsx';
import { getToken } from '../../../../utils/getToken.js';
import './RepoHeader.css';

const SPEEDS = [1, 2, 4, 8];

export default function RepoHeader({ view, onViewChange }) {
  const engine = useEngine();
  const navigate = useNavigate();
  const { opts } = engine;

  const isReal = engine.realJob;

  const repoName = isReal
    ? (engine.repositoryName || 'Documentation Job')
    : REPO.name;

  const statusLabel = isReal
    ? (engine.jobStatus || 'running')
    : REPO.branch;

  const metaText = isReal
    ? (engine.totalBatches > 0
        ? `${engine.batches.length} of ${engine.totalBatches} batches`
        : `${engine.batches.length} batches`)
    : `${fmtN(REPO.files)} files, ${REPO.mb} MB`;

  return (
    <div className="repo-head">
      <div className="repo-head__id">
        <span className="repo-head__logo"><GithubMark size={40} /></span>
        <h1 className="repo-head__name">{repoName}</h1>
        <span className={`chip ${isReal ? `chip--status-${engine.jobStatus}` : ''}`}>
          <Icon name="branch" size={15} />
          {statusLabel}
        </span>
        <span className="repo-head__meta">{metaText}</span>
        {isReal && engine.jobId && (
          <span className="repo-head__jobid" title={engine.jobId}>
            ID: {engine.jobId.slice(0, 8)}…
          </span>
        )}
      </div>

      <div className="repo-head__controls">
        {isReal ? (
          <>
            {engine.projectId && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={() =>
                  navigate(`/repository/uploaded/${encodeURIComponent(engine.projectId)}`)
                }
              >
                Back to Repository
              </button>
            )}

            {(engine.finished || engine.jobStatus === "completed") && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => engine.downloadZip()}
              >
                Download ZIP
              </button>
            )}

            <button
              type="button"
              className="btn btn--accent"
              onClick={() => {
                if (engine.projectId) {
                  engine.startProjectJob(
                    engine.projectId,
                    engine.repositoryName || 'repository',
                    getToken()
                  );
                }
              }}
            >
              Restart Documentation
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => engine.setOpt('paused', !opts.paused)}
              aria-pressed={opts.paused}
            >
              {opts.paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => engine.restart()}
            >
              Restart demo
            </button>
            <div className="seg" role="group" aria-label="Playback speed">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={opts.speed === s}
                  onClick={() => engine.setOpt('speed', s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="repo-head__side">
        <div className="repo-head__views">
          <button
            type="button"
            className="btn"
            aria-pressed={view === 'demo'}
            onClick={() => onViewChange('demo')}
          >
            {isReal ? 'Pipeline & Batches' : 'Live demo'}
          </button>
          <button
            type="button"
            className="btn"
            aria-pressed={view === 'arch'}
            onClick={() => onViewChange('arch')}
          >
            Architecture ideas
          </button>
        </div>

        {!isReal && (
          <div className="repo-head__toggles">
            {engine.autoCommit && (
              <button
                type="button"
                className="auto-chip"
                onClick={() => engine.setAutoCommit(false)}
                title="Click to turn off"
              >
                Auto-commit is on
              </button>
            )}
            <Switch
              checked={opts.secrets}
              label="Repo contains secrets"
              onChange={(v) => {
                engine.opts.secrets = v;
                engine.restart();
              }}
            />
            <Switch
              checked={opts.autopilot}
              label="Autopilot reviewer"
              title="Reviews batch 1 change by change, batch 2 file by file, batch 3 in one click, then commits the repository"
              onChange={(v) => engine.setOpt('autopilot', v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
