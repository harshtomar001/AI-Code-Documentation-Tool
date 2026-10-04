import { useState } from 'react';
import { useEngine } from '../../hooks/useEngine.js';
import DiffPane from './DiffPane.jsx';
import './HunkDiff.css';

/** A single documentation change with Generated Doc, Before/After source, and diff view. */
export default function HunkDiff({ batch, fi, hi }) {
  const engine = useEngine();
  const f = batch.files[fi];
  const h = f.hunks[hi];
  const fl = engine.flash;
  const flash = fl && fl.b === batch.id && fl.f === fi && (fl.h == null || fl.h === hi);

  const [viewMode, setViewMode] = useState('diff'); // 'diff' | 'blocks'
  const [docExpanded, setDocExpanded] = useState(true);
  const [sourceExpanded, setSourceExpanded] = useState(true);

  const hasBeforeAfter = Boolean(h.before || h.after);

  return (
    <article
      id={`hunk-${batch.id}-${fi}-${hi}`}
      className={`hunk ${flash ? 'is-flash' : ''}`}
      data-s={h.status}
    >
      <header className="hunk__head">
        <span className="hunk__n">Change {hi + 1} of {f.hunks.length}</span>
        
        <div className="hunk__title-group">
          <span className="hunk__type-badge">{h.type || 'docstring'}</span>
          <span className="hunk__t" title={h.title}>{h.title}</span>
        </div>

        <div className="hunk__actions">
          {h.status === 'pending' && (
            <>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => engine.skipHunk(batch, fi, hi)}
              >
                Skip
              </button>
              <button
                type="button"
                className="btn btn--sm btn--accent"
                onClick={() => engine.commitHunk(batch, fi, hi)}
              >
                Commit this change
              </button>
            </>
          )}
          {h.status === 'committed' && (
            <span className="hunk__st is-ok">
              {h.sha || batch.status === 'done' || !engine.realJob ? 'Committed' : 'Approved'}{' '}
              {h.sha && <code>{h.sha}</code>}
            </span>
          )}
          {h.status === 'skipped' && (
            <>
              <span className="hunk__st">Skipped</span>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => engine.unskipHunk(batch, fi, hi)}
              >
                Undo
              </button>
            </>
          )}
        </div>
      </header>

      {/* Generated Documentation section */}
      {h.content && (
        <div className="hunk__section hunk__section--doc">
          <button
            type="button"
            className="hunk__section-toggle"
            onClick={() => setDocExpanded(!docExpanded)}
            aria-expanded={docExpanded}
          >
            <span>{docExpanded ? '▼' : '►'} Generated Documentation ({h.type || 'docstring'})</span>
            <span className="hunk__section-hint">Click to {docExpanded ? 'collapse' : 'expand'}</span>
          </button>
          {docExpanded && (
            <div className="hunk__doc-body">
              <pre className="hunk__doc-pre">{h.content}</pre>
            </div>
          )}
        </div>
      )}

      {/* Before / After source code section */}
      <div className="hunk__section hunk__section--code">
        <div className="hunk__code-toolbar">
          <button
            type="button"
            className="hunk__section-toggle"
            onClick={() => setSourceExpanded(!sourceExpanded)}
            aria-expanded={sourceExpanded}
          >
            <span>{sourceExpanded ? '▼' : '►'} Source Changes</span>
          </button>

          {sourceExpanded && hasBeforeAfter && (
            <div className="hunk__mode-toggle">
              <button
                type="button"
                className={`btn btn--xs ${viewMode === 'diff' ? 'btn--active' : 'btn--ghost'}`}
                onClick={() => setViewMode('diff')}
              >
                Split Diff
              </button>
              <button
                type="button"
                className={`btn btn--xs ${viewMode === 'blocks' ? 'btn--active' : 'btn--ghost'}`}
                onClick={() => setViewMode('blocks')}
              >
                Before / After
              </button>
            </div>
          )}
        </div>

        {sourceExpanded && (
          <>
            {viewMode === 'diff' ? (
              <div className="diff">
                <DiffPane rows={h.rows} start={h.start} side="before" />
                <DiffPane rows={h.rows} start={h.start} side="after" />
              </div>
            ) : (
              <div className="ba-grid">
                <div className="ba-pane ba-pane--before">
                  <div className="ba-pane__head">
                    <span className="ba-dot ba-dot--danger" />
                    <span>BEFORE</span>
                  </div>
                  <pre className="ba-pane__code">{h.before || '(Original source not available)'}</pre>
                </div>

                <div className="ba-pane ba-pane--after">
                  <div className="ba-pane__head">
                    <span className="ba-dot ba-dot--success" />
                    <span>AFTER</span>
                  </div>
                  <pre className="ba-pane__code">{h.after || h.content || '(Modified source not available)'}</pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
