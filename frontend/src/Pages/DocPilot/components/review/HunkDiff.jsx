import { useEngine } from '../../hooks/useEngine.js';
import DiffPane from './DiffPane.jsx';
import './HunkDiff.css';

/** A single change with its own "Commit this change" button. */
export default function HunkDiff({ batch, fi, hi }) {
  const engine = useEngine();
  const f = batch.files[fi];
  const h = f.hunks[hi];
  const fl = engine.flash;
  const flash = fl && fl.b === batch.id && fl.f === fi && (fl.h == null || fl.h === hi);

  return (
    <article className={`hunk ${flash ? 'is-flash' : ''}`} data-s={h.status}>
      <header className="hunk__head">
        <span className="hunk__n">Change {hi + 1} of {f.hunks.length}</span>
        <span className="hunk__t">{h.title}</span>
        {h.status === 'pending' && (
          <>
            <button className="btn btn--sm" onClick={() => engine.skipHunk(batch, fi, hi)}>Skip</button>
            <button className="btn btn--sm btn--accent" onClick={() => engine.commitHunk(batch, fi, hi)}>Commit this change</button>
          </>
        )}
        {h.status === 'committed' && <span className="hunk__st is-ok">Committed <code>{h.sha}</code></span>}
        {h.status === 'skipped' && (
          <>
            <span className="hunk__st">Skipped</span>
            <button className="btn btn--sm btn--ghost" onClick={() => engine.unskipHunk(batch, fi, hi)}>Undo</button>
          </>
        )}
      </header>
      <div className="diff">
        <DiffPane rows={h.rows} start={h.start} side="before" />
        <DiffPane rows={h.rows} start={h.start} side="after" />
      </div>
    </article>
  );
}
