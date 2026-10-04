import { useEngine } from '../../hooks/useEngine.js';
import { pendingCount, pendingHunks } from '../../engine/helpers.js';

/** File / batch / repository commit buttons. */
export default function ReviewFooter({ batch }) {
  const engine = useEngine();
  const f = batch.files[batch.page];
  const fp = pendingHunks(f).length;
  const pend = pendingCount(batch);
  const readyBatches = engine.batches.filter((x) => x.status !== 'done' && x.status !== 'committed' && pendingCount(x) > 0);
  const readyPend = readyBatches.reduce((n, x) => n + pendingCount(x), 0);
  const busy = Boolean(engine.isBatchCommitting?.(batch.id));


  return (
    <div className="modal__foot">
      <div className="modal__foot-info">
        This file: {f.hunks.length - fp} of {f.hunks.length} changes handled. This batch: {pend} left.
      </div>
      <div className="modal__foot-btns">
        <button className="btn" disabled={!fp || busy} onClick={() => engine.commitFile(batch, batch.page)}>
          Commit all in this file ({fp})
        </button>
        <button className="btn" disabled={!pend || busy} onClick={() => engine.commitBatch(batch)}>
          {busy ? 'Committing…' : `Commit all in batch ${batch.id} (${pend})`}
        </button>
        <button className="btn btn--accent" disabled={!readyPend || busy} onClick={() => engine.requestCommitRepo()}>
          {engine.confirmRepo
            ? `Confirm: commit ${readyPend} now and auto-commit the rest`
            : 'Commit entire repository'}
        </button>
      </div>
    </div>
  );
}
