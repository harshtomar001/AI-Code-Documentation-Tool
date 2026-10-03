import { RECOMMENDATIONS } from '../../data/recommendations.js';
import { boldSegments } from '../../utils/format.js';
import ArchDiagram from './ArchDiagram.jsx';
import './ArchitectureView.css';

export default function ArchitectureView() {
  return (
    <>
      <div className="arch">
        <section className="panel">
          <div className="panel__head"><h2>Suggested system layout</h2></div>
          <div className="arch__svg"><ArchDiagram /></div>
          <p className="arch__cap">
            The three highlighted boxes are what let batch 2 finish while you are still reviewing batch 1.
            Generation writes to the patch store, the review window only reads from it.
          </p>
        </section>
        <div className="recs">
          {RECOMMENDATIONS.map((r) => (
            <article key={r.title} className="rec">
              <h3>{r.title} <small>{r.tag}</small></h3>
              <p>{boldSegments(r.body).map((s, i) => (s.b ? <b key={i}>{s.t}</b> : s.t))}</p>
            </article>
          ))}
        </div>
      </div>
      <section className="panel arch__note">
        <b>How the demo maps your flow:</b> each popup page is one file, and each file holds several changes.
        "Commit this change" saves one change, "Commit all in this file" saves the page, "Commit batch" saves all 10 pages,
        and "Commit entire repository" saves everything that is ready now and auto-commits every batch that arrives later.
      </section>
    </>
  );
}
