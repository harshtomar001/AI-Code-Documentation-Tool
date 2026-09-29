import { useState } from 'react';
import { useEngine } from '../../hooks/useEngine.js';
import { batchState, changesIn, pendingCount } from '../../engine/helpers.js';
import './BatchList.css';

const FILTERS = [
  ['all', 'All'],
  ['review', 'To review'],
  ['generating', 'Generating'],
  ['queued', 'Queued'],
  ['done', 'Committed'],
];
const LABEL = { queued: 'Queued', generating: 'Generating', ready: 'Ready to review', partial: 'Partly reviewed', done: 'Committed' };

const matches = (filter, s) =>
  filter === 'all' || (filter === 'review' ? s === 'ready' || s === 'partial' : filter === s);

/** The dropdown behind "Creating batches": all 100 batches, live. */
export default function BatchList() {
  const engine = useEngine();
  const [filter, setFilter] = useState('all');
  const rows = engine.batches.map((b) => ({ b, s: batchState(b) }));
  const count = (f) => rows.filter((r) => matches(f, r.s)).length;
  const shown = rows.filter((r) => matches(filter, r.s));
  const firstReady = rows.find((r) => r.s === 'ready' || r.s === 'partial');

  return (
    <div className="batches">
      <div className="batches__top">
        <div className="batches__tabs" role="group" aria-label="Filter batches">
          {FILTERS.map(([key, label]) => (
            <button key={key} className="tab" aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {label}<b>{count(key)}</b>
            </button>
          ))}
        </div>
        <button
          className="btn btn--sm btn--accent"
          disabled={!firstReady}
          onClick={() => engine.openModal(firstReady.b.id - 1)}
        >
          {firstReady ? `Review batch ${firstReady.b.id}` : 'Nothing to review yet'}
        </button>
      </div>

      <div className="batches__scroll">
        {shown.length === 0 && <div className="batches__empty">No batches in this list yet.</div>}
        {shown.map(({ b, s }) => (
          <div key={b.id} className={`batch batch--${s}`}>
            <span className="batch__id">Batch {b.id}</span>
            <span className="batch__info">
              <span>
                {s === 'queued' && `${b.files.length} files waiting for a worker`}
                {s === 'generating' && `worker-${b.worker} writing docstrings`}
                {(s === 'ready' || s === 'partial') && `${changesIn(b)} changes, ${pendingCount(b)} to commit`}
                {s === 'done' && `${changesIn(b)} changes handled`}
              </span>
              {s === 'generating' && <span className="batch__prog"><b style={{ width: `${Math.min(100, b.p * 100)}%` }} /></span>}
              <span className={`pill pill--${s}`}>
                {s === 'generating' ? `${Math.round(b.p * 100)}%` : LABEL[s]}
              </span>
            </span>
            {(s === 'ready' || s === 'partial' || s === 'done') ? (
              <button className={`btn btn--sm ${s === 'done' ? '' : 'btn--outline'}`} onClick={() => engine.openModal(b.id - 1)}>
                {s === 'ready' ? 'Review' : s === 'partial' ? 'Continue' : 'View'}
              </button>
            ) : <span />}
          </div>
        ))}
      </div>
    </div>
  );
}
