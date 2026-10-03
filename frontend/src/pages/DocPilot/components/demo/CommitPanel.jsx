import { useEngine } from '../../hooks/useEngine.js';
import { PR_BRANCH } from '../../data/constants.js';
import { fmtN } from '../../utils/format.js';
import Icon from '../common/Icon.jsx';
import './CommitPanel.css';

/** Change the <h2> text below if you prefer the label "Comments". */
export default function CommitPanel() {
  const engine = useEngine();
  const t = engine.tally();
  return (
    <section className="panel" aria-labelledby="cm-h">
      <div className="panel__head">
        <h2 id="cm-h">Commits</h2>
        <span className="commits__branch">
          <Icon name="branch" size={15} /><span>{PR_BRANCH}</span><Icon name="chevronDown" size={15} />
        </span>
      </div>
      {engine.commitCount === 0 ? (
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
            {engine.commitCount} commit{engine.commitCount > 1 ? 's' : ''}, {fmtN(t.committed)} of {fmtN(t.total)} changes committed
          </p>
          <ul className="commits__list">
            {engine.commits.map((c) => (
              <li key={c.id} className="cm">
                <code>{c.sha}</code><span>{c.msg}</span><em>+{c.n}</em>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
