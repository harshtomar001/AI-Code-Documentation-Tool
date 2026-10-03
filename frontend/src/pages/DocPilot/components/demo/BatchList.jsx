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

const matches = (filter, s) =>
  filter === 'all' ||
  (filter === 'review'
    ? s === 'ready' || s === 'partial' || s === 'completed'
    : filter === s);

/** The dropdown behind "Creating batches": displays real and simulated batches dynamically. */
export default function BatchList() {
  const engine = useEngine();
  const [filter, setFilter] = useState('all');

  const rows = engine.batches.map((b, idx) => ({
    b,
    idx,
    s: batchState(b),
  }));

  const count = (f) => rows.filter((r) => matches(f, r.s)).length;
  const shown = rows.filter((r) => matches(filter, r.s));
  const firstReady = rows.find(
    (r) => r.s === 'ready' || r.s === 'partial' || r.s === 'completed'
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
            : 'Nothing to review yet'}
        </button>
      </div>

      <div className="batches__scroll">
        {shown.length === 0 && (
          <div className="batches__empty">No batches in this list yet.</div>
        )}

        {shown.map(({ b, idx, s }) => {
          const filesCount = b.files?.length || 0;
          const changesCount = changesIn(b);
          const hasReadme = Boolean(b.readme);

          return (
            <div key={b.id} className={`batch batch--${s}`}>
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

                <span className={`pill pill--${s}`}>
                  {s === 'generating'
                    ? `${Math.round((b.p || 0) * 100)}%`
                    : LABEL[s] || s}
                </span>
              </div>

              <div className="batch__action">
                <button
                  type="button"
                  className={`btn btn--sm ${
                    s === 'done' ? 'btn--ghost' : 'btn--accent'
                  }`}
                  onClick={() => engine.openModal(idx)}
                >
                  {s === 'done' ? 'View Batch' : 'Review Batch'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
