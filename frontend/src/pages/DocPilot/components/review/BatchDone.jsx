import { useEngine } from '../../hooks/useEngine.js';
import { PR_BRANCH } from '../../data/constants.js';
import Icon from '../common/Icon.jsx';
import './BatchDone.css';

export default function BatchDone({ batch }) {
  const engine = useEngine();
  let c = 0, s = 0;
  batch.files.forEach((f) => f.hunks.forEach((h) => { if (h.status === 'committed') c++; else if (h.status === 'skipped') s++; }));
  const next = engine.batches.findIndex((x) => x.status === 'ready');
  const waiting = engine.batches.filter((x) => x.status === 'ready').length;

  return (
    <div className="done">
      <div className="done__ck"><Icon name="check" size={30} stroke={3.2} /></div>
      <h3>Batch {batch.id} is done</h3>
      <p>{c} changes committed{s ? `, ${s} skipped` : ''} on <code>{PR_BRANCH}</code></p>
      {waiting > 0 && <p>{waiting} more {waiting === 1 ? 'batch is' : 'batches are'} waiting for review.</p>}
      <div className="done__btns">
        {next >= 0 && <button className="btn btn--accent" onClick={() => engine.switchBatch(next)}>Review batch {next + 1}</button>}
        <button className="btn" onClick={() => engine.closeModal()}>Close window</button>
      </div>
    </div>
  );
}
