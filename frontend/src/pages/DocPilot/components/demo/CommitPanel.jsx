import { useEngine } from '../../hooks/useEngine.js';
import { PR_BRANCH } from '../../data/constants.js';
import { fmtN, fmtAgo } from '../../utils/format.js';
import Icon from '../common/Icon.jsx';
import './CommitPanel.css';

/**
 * Commit history for the job.
 *
 * Real jobs: every row is a commit the backend confirmed (or the server's own
 * history when GET /jobs/{id}/commits exists). Approved-but-not-yet-committed
 * changes are shown separately as "staged", and a batch that is being written
 * right now shows as "committing".
 */
export default function CommitPanel() {
  const engine = useEngine();
  const t = engine.tally();
  const projName =
    engine.repositoryName ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("projectName") ||
        localStorage.getItem("docpilot_last_repo")
      : null) ||
    "project";
  const cleanName = projName.split("/").pop() || "project";
  const branchName = `ai-docs/${cleanName}`;

  const committing = engine.batches.filter((b) => engine.isBatchCommitting(b.id));
  const staged = engine.realJob ? t.staged || 0 : 0;
  const hasAnything = engine.commitCount > 0 || committing.length > 0 || staged > 0;

  return (
    <section className="panel" aria-labelledby="cm-h">
      <div className="panel__head">
        <h2 id="cm-h">Commits</h2>
        <span className="commits__branch">
          <Icon name="branch" size={15} /><span>{branchName}</span><Icon name="chevronDown" size={15} />
        </span>
      </div>

      {!hasAnything ? (
        <div className="commits__empty">
          <span className="commits__empty-icon"><Icon name="chat" size={22} stroke={1.7} /></span>
          <div>
            <p>Nothing committed yet.</p>
            <p>Approve changes in the review window.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="commits__stat">
            {engine.commitCount} commit{engine.commitCount === 1 ? '' : 's'}, {fmtN(t.committed)} of {fmtN(t.total)} changes committed
            {staged > 0 && ` · ${fmtN(staged)} approved, waiting for the batch commit`}
          </p>
          <ul className="commits__list">
            {committing.map((b) => (
              <li key={`pending-${b.id}`} className="cm cm--pending">
                <code>······</code>
                <span>Committing batch {b.id}…</span>
                <em>…</em>
              </li>
            ))}
            {engine.commits.map((c) => (
              <li key={c.id} className="cm" title={c.at ? new Date(c.at).toLocaleString() : undefined}>
                <code>{c.sha}</code>
                <span>
                  {c.msg}
                  {c.at ? <small className="cm__ago"> · {fmtAgo(c.at)}</small> : null}
                </span>
                <em>+{c.n}</em>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
