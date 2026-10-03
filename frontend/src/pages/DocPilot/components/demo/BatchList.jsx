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

const LABEL = {
  queued: 'Queued',
  generating: 'Generating',
  ready: 'Ready for review',
  partial: 'Partly reviewed',
  done: 'Reviewed',
  completed: 'Ready for review',
};

const matches = (filter, r) => {
  if (filter === 'all') return true;
  if (filter === 'review') {
    return !r.isCommitted && (r.s === 'ready' || r.s === 'partial');
  }
  if (filter === 'done') {
    return r.isCommitted || r.s === 'done';
  }
  return filter === r.s;
};

const checkIsCommitted = (b) => {
  const s = batchState(b);
  return (
    s === 'done' ||
    s === 'committed' ||
    b.status === 'done' ||
    b.status === 'committed' ||
    (b.files && b.files.length > 0 && pendingCount(b) === 0)
  );
};

/** The dropdown behind "Creating batches": displays real and simulated batches dynamically. */
export default function BatchList() {
  const engine = useEngine();
  const [filter, setFilter] = useState('all');

  const rows = engine.batches.map((b, idx) => {
    const committed = checkIsCommitted(b);
    return {
      b,
      idx,
      s: committed ? 'done' : batchState(b),
      isCommitted: committed,
    };
  });

  const count = (f) => rows.filter((r) => matches(f, r)).length;
  const shown = rows.filter((r) => matches(filter, r));
  const firstReady = rows.find(
    (r) => !r.isCommitted && (r.s === 'ready' || r.s === 'partial')
  );

  return (
    <div className="batches">
      <div className="batches__top">
        <div
          className="batches__tabs"
          role="group"
          aria-label="Filter batches"
        >
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="tab"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
              <b>{count(key)}</b>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn--sm btn--accent"
          disabled={!firstReady}
          onClick={() => {
            if (firstReady) {
              engine.openModal(firstReady.idx);
            }
          }}
        >
          {firstReady
            ? `Review batch ${firstReady.b.id}`
            : 'All batches reviewed'}
        </button>
      </div>

      <div className="batches__scroll">
        {shown.length === 0 && (
          <div className="batches__empty">No batches in this list yet.</div>
        )}

        {shown.map(({ b, idx, s, isCommitted }) => {
          const filesCount = b.files?.length || 0;
          const changesCount = changesIn(b);
          const hasReadme = Boolean(b.readme);

          return (
            <div key={b.id} className={`batch batch--${s} ${isCommitted ? 'batch--committed' : ''}`}>
              <span className="batch__id">Batch #{b.id}</span>

              <div className="batch__info">
                <div className="batch__meta-row">
                  <span className="batch__meta-item">
                    <b>Files:</b> {filesCount}
                  </span>
                  <span className="batch__meta-dot">•</span>
                  <span className="batch__meta-item">
                    <b>Changes:</b> {changesCount}
                  </span>
                  <span className="batch__meta-dot">•</span>
                  <span
                    className={`batch__meta-item ${
                      hasReadme ? 'batch__readme--ok' : ''
                    }`}
                  >
                    <b>README:</b> {hasReadme ? 'Generated' : 'None'}
                  </span>
                </div>

                {s === 'generating' && (
                  <span className="batch__prog">
                    <b style={{ width: `${Math.min(100, (b.p || 0) * 100)}%` }} />
                  </span>
                )}

                {isCommitted ? (
                  <div className="batch__status-badges">
                    <span className="pill pill--done">✓ Reviewed</span>
                    <span className="pill pill--committed">✓ Committed</span>
                  </div>
                ) : (
                  <span className={`pill pill--${s}`}>
                    {s === 'generating'
                      ? `${Math.round((b.p || 0) * 100)}%`
                      : LABEL[s] || s}
                  </span>
                )}
              </div>

              <div className="batch__action">
                {!isCommitted && (
                  <button
                    type="button"
                    className="btn btn--sm btn--accent"
                    onClick={() => engine.openModal(idx)}
                  >
                    Review Batch
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


