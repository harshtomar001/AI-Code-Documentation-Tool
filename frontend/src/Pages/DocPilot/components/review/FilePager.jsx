import { useEngine } from '../../hooks/useEngine.js';
import Icon from '../common/Icon.jsx';
import './FilePager.css';

function fileState(f) {
  const p = f.hunks.filter((h) => h.status === 'pending').length;
  if (p === f.hunks.length) return '';
  if (p > 0) return 'is-part';
  return f.hunks.some((h) => h.status === 'committed') ? 'is-done' : 'is-skip';
}

/** Page 1..10: one page per file in the batch. */
export default function FilePager({ batch, file }) {
  const engine = useEngine();
  const last = batch.files.length - 1;
  return (
    <>
      <div className="pager">
        <button className="icon-btn" onClick={() => engine.gotoPage(batch.page - 1)} disabled={batch.page === 0} aria-label="Previous file">
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
        <button className="icon-btn" onClick={() => engine.gotoPage(batch.page + 1)} disabled={batch.page === last} aria-label="Next file">
          <Icon name="chevronRight" size={16} stroke={2.4} />
        </button>
      </div>
      <div className="fileinfo">
        <span className="fileinfo__path">{file.name}</span>
        <span className="fileinfo__meta">Page {batch.page + 1} of {batch.files.length}, {file.hunks.length} changes</span>
        <span className="fileinfo__ok">Code unchanged, only comments differ</span>
      </div>
    </>
  );
}
