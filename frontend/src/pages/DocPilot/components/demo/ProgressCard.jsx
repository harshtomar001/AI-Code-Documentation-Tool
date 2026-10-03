import { useEngine } from '../../hooks/useEngine.js';
import { REPO } from '../../data/constants.js';
import './ProgressCard.css';

export default function ProgressCard() {
  const engine = useEngine();
  const c = engine.counts();

  const isReal = engine.realJob;
  const total = isReal
    ? (engine.totalBatches || engine.batches.length || 1)
    : REPO.batches;

  const generated = isReal ? engine.batches.length : (c.ready + c.done);
  const genPct = Math.min(100, Math.round((generated / total) * 100));
  const donePct = Math.min(100, Math.round((c.done / total) * 100));

  let text = 'Waiting for the batches to be created...';

  if (isReal) {
    if (engine.jobStatus === 'failed') {
      text = `Documentation generation failed: ${engine.jobError || 'An error occurred'}`;
    } else if (engine.finished || engine.jobStatus === 'completed') {
      text = `Complete. All ${total} batches generated and available for review.`;
    } else if (engine.generating || engine.jobStatus === 'running') {
      text = total > 1
        ? `Documentation generation in progress... Batch ${generated} / ${total}`
        : `Documentation generation in progress... Processing files`;
    } else if (engine.jobStatus === 'queued') {
      text = 'Documentation job queued. Waiting for worker to begin...';
    } else if (engine.jobStatus === 'loading') {
      text = 'Loading documentation job and batch results...';
    } else if (engine.jobStatus === 'starting') {
      text = 'Starting documentation pipeline...';
    }
  } else {
    if (engine.finished) {
      text = `Complete. All ${REPO.batches} batches are committed and the pull request is open.`;
    } else if (engine.generating) {
      text = generated === REPO.batches
        ? `All ${REPO.batches} batches generated. ${c.ready} still waiting for review.`
        : `Generating docstrings for ${generated} of ${REPO.batches} batches...`;
    }
  }

  return (
    <section className="panel progress" aria-labelledby="prog-h">
      <h2 id="prog-h" style={{ fontSize: 16, fontWeight: 600 }}>
        Generating documentation
      </h2>
      <div className="progress__row">
        <div
          className="progress__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={genPct}
        >
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
