import { useEngine } from '../../hooks/useEngine.js';
import { REPO } from '../../data/constants.js';
import { fmtN } from '../../utils/format.js';
import Icon, { GithubMark } from '../common/Icon.jsx';
import Switch from '../common/Switch.jsx';
import './RepoHeader.css';

const SPEEDS = [1, 2, 4, 8];

export default function RepoHeader({ view, onViewChange }) {
  const engine = useEngine();
  const { opts } = engine;

  return (
    <div className="repo-head">
      <div className="repo-head__id">
        <span className="repo-head__logo"><GithubMark size={40} /></span>
        <h1 className="repo-head__name">{REPO.name}</h1>
        <span className="chip"><Icon name="branch" size={15} />{REPO.branch}</span>
        <span className="repo-head__meta">{fmtN(REPO.files)} files, {REPO.mb} MB</span>
      </div>

      <div className="repo-head__controls">
        <button className="btn" onClick={() => engine.setOpt('paused', !opts.paused)} aria-pressed={opts.paused}>
          {opts.paused ? 'Resume' : 'Pause'}
        </button>
        <button className="btn" onClick={() => engine.restart()}>Restart demo</button>
        <div className="seg" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button key={s} aria-pressed={opts.speed === s} onClick={() => engine.setOpt('speed', s)}>{s}x</button>
          ))}
        </div>
      </div>

      <div className="repo-head__side">
        <div className="repo-head__views">
          <button className="btn" aria-pressed={view === 'demo'} onClick={() => onViewChange('demo')}>Live demo</button>
          <button className="btn" aria-pressed={view === 'arch'} onClick={() => onViewChange('arch')}>Architecture ideas</button>
        </div>
        <div className="repo-head__toggles">
          {engine.autoCommit && (
            <button className="auto-chip" onClick={() => engine.setAutoCommit(false)} title="Click to turn off">
              Auto-commit is on
            </button>
          )}
          <Switch
            checked={opts.secrets}
            label="Repo contains secrets"
            onChange={(v) => { engine.opts.secrets = v; engine.restart(); }}
          />
          <Switch
            checked={opts.autopilot}
            label="Autopilot reviewer"
            title="Reviews batch 1 change by change, batch 2 file by file, batch 3 in one click, then commits the repository"
            onChange={(v) => engine.setOpt('autopilot', v)}
          />
        </div>
      </div>
    </div>
  );
}
