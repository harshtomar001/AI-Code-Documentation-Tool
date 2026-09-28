import { useEngine } from '../../hooks/useEngine.js';
import { pendingCount } from '../../engine/helpers.js';
import './BackgroundStrip.css';

/** Shows what is still happening on the server while the person reviews one batch. */
export default function BackgroundStrip() {
  const engine = useEngine();
  const cur = engine.modal.batch;
  const c = engine.counts();
  const others = engine.batches.filter((b) => b.status === 'ready' && b.id - 1 !== cur);

  return (
    <div className="bg">
      <span className="bg__live"><i className="bg__spin" />Still running in the background: {c.generating} generating, {c.queued} queued</span>
      {others.length ? (
        <span className="bg__chips">
          {others.slice(0, 6).map((b) => (
            <button key={b.id} className={`bg__chip ${b.fresh ? 'is-fresh' : ''}`} onClick={() => engine.switchBatch(b.id - 1)}>
              Batch {b.id} ready, {pendingCount(b)} pending
            </button>
          ))}
          {others.length > 6 && <span className="bg__none">and {others.length - 6} more</span>}
        </span>
      ) : (
        <span className="bg__none">No other batch is waiting yet.</span>
      )}
      {engine.notice && <div className="bg__note">{engine.notice}</div>}
    </div>
  );
}
