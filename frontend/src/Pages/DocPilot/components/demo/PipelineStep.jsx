import { useEngine } from '../../hooks/useEngine.js';
import { fmtDuration } from '../../utils/format.js';
import Icon from '../common/Icon.jsx';
import Badge from '../common/Badge.jsx';
import BatchList from './BatchList.jsx';

function StatusIcon({ state, index }) {
  return (
    <span className={`rail__icon is-${state}`}>
      {state === 'done' && <Icon name="check" size={17} stroke={3.2} />}
      {state === 'alert' && '!'}
      {state === 'skipped' && '\u2013'}
      {state === 'pending' && index + 1}
      {state === 'active' && <i className="rail__spin" />}
    </span>
  );
}

function StepBody({ stepKey, step }) {
  const engine = useEngine();
  if (stepKey === 'batch') return <BatchList />;
  let lines = step.lines;
  if (stepKey === 'gen') {
    const c = engine.counts();
    lines = [
      `${c.generating} batches generating on ${engine.workers} workers`,
      `${c.ready} batches waiting for your review`,
      `${c.done} batches fully committed`,
      `${c.queued} batches queued`,
    ];
  }
  return (
    <ul className="step__lines">
      {lines.map((l, i) => <li key={i}>{l}</li>)}
    </ul>
  );
}

/**
 * One row of the timeline. Click to expand.
 * The "Creating batches" row only expands once it is complete and carries the
 * Android-style badge with the number of batches waiting for review.
 */
export default function PipelineStep({ def, index, prevState, open, onToggle, isLast }) {
  const engine = useEngine();
  const step = engine.steps[def.key];
  const ms = engine.stepMs(def.key);
  const isBatch = def.key === 'batch';
  const expandable = def.key === 'gen' ? step.state !== 'pending' : isBatch ? step.state === 'done' : step.state === 'done' || step.state === 'alert';
  const badge = isBatch ? engine.counts().ready : 0;
  const showBar = step.state === 'active';
  const prevClass = prevState ? `is-${prevState}` : 'is-hidden';

  return (
    <li className="step">
      <div className="rail">
        <span className={`rail__seg rail__seg--top ${index === 0 ? 'is-hidden' : prevClass}`} />
        <StatusIcon state={step.state} index={index} />
        <span className={`rail__seg rail__seg--bottom ${isLast ? 'is-hidden' : `is-${step.state}`}`} />
      </div>

      <div className={`step__card is-${step.state} ${badge ? 'has-badge' : ''}`}>
        <Badge count={badge} label={`${badge} batches ready to review`} />
        <button
          className="step__head"
          aria-expanded={expandable ? open : undefined}
          disabled={!expandable}
          onClick={onToggle}
          title={isBatch && !expandable ? 'Available when all batches are created' : undefined}
        >
          <span>
            <span className="step__title" style={{ display: 'block' }}>{def.title}</span>
            <span className="step__detail" style={{ display: 'block' }}>{step.detail}</span>
          </span>
          <span className="step__meta">
            <span>{step.state === 'skipped' ? 'Skipped' : ms != null ? fmtDuration(ms) : ''}</span>
            <span className={`step__chev ${open && expandable ? 'is-open' : ''} ${expandable ? '' : 'is-off'}`}>
              <Icon name="chevronDown" size={20} />
            </span>
          </span>
        </button>
        {showBar && <div className="step__bar"><b style={{ width: `${step.pct * 100}%` }} /></div>}
        {open && expandable && (
          <div className="step__body"><StepBody stepKey={def.key} step={step} /></div>
        )}
      </div>
    </li>
  );
}
