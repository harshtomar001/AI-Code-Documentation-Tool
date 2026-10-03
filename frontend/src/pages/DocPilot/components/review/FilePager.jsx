import { useEngine } from '../../hooks/useEngine.js';
import Icon from '../common/Icon.jsx';
import './FilePager.css';

function fileState(f) {
  const p = f.hunks.filter((h) => h.status === 'pending').length;
  if (p === f.hunks.length) return '';
  if (p > 0) return 'is-part';
  return f.hunks.some((h) => h.status === 'committed') ? 'is-done' : 'is-skip';
}

/** Page 1..N: one page per file in the batch + Function/Class symbol navigation. */
export default function FilePager({ batch, file, onSelectHunk }) {
  const engine = useEngine();
  const last = batch.files.length - 1;
  return (
    <>
      <div className="pager">
        <button
          className="icon-btn"
          onClick={() => engine.gotoPage(batch.page - 1)}
          disabled={batch.page === 0}
          aria-label="Previous file"
          title="Previous file"
        >
          <Icon name="chevronLeft" size={16} stroke={2.4} />
        </button>
        <div className="pager__dots" role="group" aria-label="Files in this batch">
          {batch.files.map((x, i) => (
            <button
              key={x.name + i}
              className={`dp ${fileState(x)} ${i === batch.page ? 'is-cur' : ''}`}
              onClick={() => engine.gotoPage(i)}
              title={x.name}
              aria-label={`File ${i + 1}: ${x.name}`}
              aria-current={i === batch.page ? 'page' : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          className="icon-btn"
          onClick={() => engine.gotoPage(batch.page + 1)}
          disabled={batch.page === last}
          aria-label="Next file"
          title="Next file"
        >
          <Icon name="chevronRight" size={16} stroke={2.4} />
        </button>

        {batch.files.length > 1 && (
          <select
            className="pager__select"
            value={batch.page}
            onChange={(e) => engine.gotoPage(Number(e.target.value))}
            aria-label="Select file"
          >
            {batch.files.map((x, i) => (
              <option key={x.name + i} value={i}>
                {i + 1}. {x.name} ({x.hunks.length} {x.hunks.length === 1 ? 'change' : 'changes'})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="fileinfo">
        <span className="fileinfo__path">{file.name}</span>
        <span className="fileinfo__meta">
          File {batch.page + 1} of {batch.files.length} • {file.hunks.length} documentation {file.hunks.length === 1 ? 'change' : 'changes'}
        </span>
        <span className="fileinfo__ok">Code unchanged, only comments differ</span>
      </div>

      {file.hunks && file.hunks.length > 0 && (
        <div className="symbols-bar" aria-label="Functions and classes in this file">
          <span className="symbols-bar__title">Functions & Classes:</span>
          <div className="symbols-bar__chips">
            {file.hunks.map((h, hi) => (
              <button
                key={`${h.target || 'sym'}-${hi}`}
                type="button"
                className={`symbol-chip is-${h.status || 'pending'}`}
                onClick={() => onSelectHunk?.(hi)}
                title={`Jump to ${h.target || `change ${hi + 1}`}`}
              >
                <span className="symbol-chip__type">{h.type || 'def'}</span>
                <span className="symbol-chip__name">{h.target || `Change #${hi + 1}`}</span>
                {h.status === 'committed' && <span className="symbol-chip__status">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
