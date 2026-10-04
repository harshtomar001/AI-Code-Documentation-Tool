import { useEffect, useRef } from 'react';
import { useEngine } from '../../hooks/useEngine.js';
import './EventFeed.css';

const TAGS = {
  upload: 'upload',
  server: 'server',
  ast: 'ast',
  scan: 'scan',
  secret: 'security',
  security: 'security',
  secure: 'redact',
  redaction: 'redact',
  batch: 'batch',
  batching: 'batching',
  gen: 'ai-gen',
  generation: 'ai-gen',
  job: 'job',
  ready: 'ready',
  commit: 'commit',
  done: 'done',
};

export default function EventFeed() {
  const engine = useEngine();
  const listRef = useRef(null);


  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [engine.events.length, engine.events[engine.events.length - 1]?.id]);

  return (
    <section className="panel" aria-labelledby="feed-h">
      <div className="panel__head">
        <h2 id="feed-h">Live events from the server</h2>
        <span className="feed__live"><i />streamed over SSE</span>
      </div>
      <ul className="feed__list" ref={listRef} aria-live="off">
        {engine.events.length === 0 && (
          <li className="feed__empty">Events appear here as soon as the upload starts.</li>
        )}
        {engine.events.map((e) => (
          <li key={e.id} className={`ev ev--${e.kind}`}>
            <span className="ev__bullet">●</span>
            <time>{e.time}</time>
            <b>{TAGS[e.kind] || e.kind}</b>
            <span className="ev__msg">{e.msg}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
