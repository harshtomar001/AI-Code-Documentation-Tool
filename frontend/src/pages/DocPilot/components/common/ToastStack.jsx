import { useEffect } from 'react';
import { useEngine } from '../../hooks/useEngine.js';
import Icon from './Icon.jsx';
import './ToastStack.css';

const ICONS = { ready: 'bell', info: 'bell', ok: 'check', warn: 'alert' };
const DURATION = 6000;

function Toast({ toast, engine }) {
  useEffect(() => {
    const id = setTimeout(() => engine.dismissToast(toast.id), DURATION);
    return () => clearTimeout(id);
  }, [toast.id, toast.ts, engine]);

  const act = () => {
    engine.openModal(toast.action.batch);
    engine.dismissToast(toast.id);
  };

  return (
    <div
      className={`toast toast--${toast.kind === 'ready' ? 'info' : toast.kind}`}
      role="status"
    >
      <span className="toast__icon">
        <Icon name={ICONS[toast.kind] || 'bell'} size={17} />
      </span>

      <div>
        <div className="toast__title">{toast.title}</div>
        <div className="toast__text">{toast.text}</div>

        {toast.action && (
          <button
            className="btn btn--sm btn--accent"
            onClick={act}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        className="toast__close"
        aria-label="Dismiss notification"
        onClick={() => engine.dismissToast(toast.id)}
      >
        <Icon name="close" size={14} />
      </button>

      <span key={toast.ts} className="toast__timer" />
    </div>
  );
}

function BackgroundNotice({ notice }) {
  return (
    <div className="toast toast--info" role="status">
      <span className="toast__icon">
        <Icon name="bell" size={17} />
      </span>

      <div>
        <div className="toast__title">Batch finished</div>
        <div className="toast__text">{notice}</div>
      </div>

      <span className="toast__timer toast__timer--notice" />
    </div>
  );
}

export default function ToastStack() {
  const engine = useEngine();

  return (
    <div className="toasts" aria-live="polite">
      {engine.notice && (
        <BackgroundNotice notice={engine.notice} />
      )}

      {engine.toasts.slice(0, 3).map((t) => (
        <Toast
          key={t.id}
          toast={t}
          engine={engine}
        />
      ))}
    </div>
  );
}
