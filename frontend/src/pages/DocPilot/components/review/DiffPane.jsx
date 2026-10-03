import { highlight } from '../../utils/highlight.jsx';

/** One side (Before or After) of a change. Added lines are ghost rows on the Before side. */
export default function DiffPane({ rows, start, side }) {
  const isBefore = side === 'before';
  let n = start;
  let animIndex = 0;

  return (
    <div className={`pane pane--${side}`}>
      <div className="pane__head"><i />{isBefore ? 'Before' : 'After'}</div>
      <div className="rows">
        {rows.map((r, i) => {
          if (isBefore) {
            if (r.t === 'a') return <div key={i} className="ln ln--ghost"><i /><code> </code></div>;
            return (
              <div key={i} className={`ln ${r.t === 'm' ? 'ln--mod' : ''}`}>
                <i>{n++}</i><code>{highlight(r.before)}</code>
              </div>
            );
          }
          if (r.t === 'a')
            return (
              <div key={i} className="ln ln--add" style={{ '--i': animIndex++ }}>
                <i>{n++}</i><code>{r.after || ' '}</code>
              </div>
            );
          if (r.t === 'm')
            return (
              <div key={i} className="ln ln--add is-mark" style={{ '--i': animIndex++ }}>
                <i>{n++}</i><code>{highlight(r.after)}</code>
              </div>
            );
          return <div key={i} className="ln"><i>{n++}</i><code>{highlight(r.after)}</code></div>;
        })}
      </div>
    </div>
  );
}
