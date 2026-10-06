import { useEngine } from '../../hooks/useEngine.js';
import { batchState, pendingCount } from '../../engine/helpers.js';
import { PR_BRANCH } from '../../data/constants.js';
import Icon from '../common/Icon.jsx';
import './BatchDone.css';

const isCommitted = (b, engine) => {
  const s = batchState(b);
  return (
    Boolean(engine?.isBatchCommitted?.(b.id)) ||
    s === 'done' ||
    s === 'committed' ||
    b.status === 'done' ||
    b.status === 'committed' ||
    (b.files && b.files.length > 0 && pendingCount(b) === 0)
  );
};

export default function BatchDone({ batch }) {
  const engine = useEngine();
  const projName =
    engine.repositoryName ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("projectName") ||
        localStorage.getItem("docpilot_last_repo")
      : null) ||
    "project";
  const cleanName = projName.split("/").pop() || "project";
  const branchName = `ai-docs/${cleanName}`;
  let c = 0, s = 0;
  (batch.files || []).forEach((f) =>
    (f.hunks || []).forEach((h) => {
      if (h.status === 'committed') c++;
      else if (h.status === 'skipped') s++;
    })
  );
  const commitDesc =
    c > 0
      ? `${c} change${c > 1 ? 's' : ''} committed`
      : batch.readme
      ? 'README documentation committed'
      : 'Documentation committed';
  const next = engine.batches.findIndex((x) => !isCommitted(x, engine) && (x.status === 'ready' || batchState(x) === 'partial'));
  const waiting = engine.batches.filter((x) => !isCommitted(x, engine) && (x.status === 'ready' || batchState(x) === 'partial')).length;


  return (
    <div className="done">
      <div className="done__ck"><Icon name="check" size={30} stroke={3.2} /></div>
      <h3>Batch {batch.id} is done</h3>
      <p>{commitDesc}{s ? `, ${s} skipped` : ''} on <code>{branchName}</code></p>
      {waiting > 0 && <p>{waiting} more {waiting === 1 ? 'batch is' : 'batches are'} waiting for review.</p>}
      <div className="done__btns">
        {next >= 0 && <button className="btn btn--accent" onClick={() => engine.switchBatch(next)}>Review batch {engine.batches[next]?.id || next + 1}</button>}
        <button className="btn" onClick={() => engine.closeModal()}>Close window</button>
      </div>
    </div>
  );
}
