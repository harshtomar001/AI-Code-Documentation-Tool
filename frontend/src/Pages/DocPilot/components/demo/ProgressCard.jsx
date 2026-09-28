import { useEngine } from '../../hooks/useEngine.js';
import { REPO } from '../../data/constants.js';
import './ProgressCard.css';

export default function ProgressCard() {
  const engine = useEngine();
  const c = engine.counts();
  const generated = c.ready + c.done;
  const genPct = Math.round((generated / REPO.batches) * 100);
  const donePct = Math.round((c.done / REPO.batches) * 100);

  let text = 'Waiting for the batches to be created...';
  if (engine.finished) text = `Complete. All ${REPO.batches} batches are committed and the pull request is open.`;
  else if (engine.generating) {
    text = generated === REPO.batches
      ? `All ${REPO.batches} batches generated. ${c.ready} still waiting for review.`
      : `Generating docstrings for ${generated} of ${REPO.batches} batches...`;
  }

  return (
    <section className="panel progress" aria-labelledby="prog-h">
      <h2 id="prog-h" style={{ fontSize: 16, fontWeight: 600 }}>Generating documentation</h2>
      <div className="progress__row">
        <div className="progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={genPct}>
          <div className="progress__gen" style={{ width: `${genPct}%` }} />
          <div className="progress__done" style={{ width: `${donePct}%` }} />
        </div>
        <span className="progress__pct">{genPct}%</span>
      </div>
      <p className="progress__text">{text}</p>
      <div className="progress__legend">
        <span><i />Generated {generated}</span>
        <span><i className="g" />Committed {c.done}</span>
      </div>
    </section>
  );
}
