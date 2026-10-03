import { useEngine } from '../../hooks/useEngine.js';
import './EventFeed.css';

const TAGS = {
  upload: 'upload', server: 'server', scan: 'scan', secret: 'secret', secure: 'secure',
  batch: 'batch', gen: 'worker', ready: 'ready', commit: 'commit', done: 'done',
};

export default function EventFeed() {
  const engine = useEngine();
  return (
    <section className="panel" aria-labelledby="feed-h">
      <div className="panel__head">
        <h2 id="feed-h">Live events from the server</h2>
        <span className="feed__live"><i />streamed over SSE</span>
      </div>
      <ul className="feed__list" aria-live="off">
        {engine.events.length === 0 && <li className="feed__empty">Events appear here as soon as the upload starts.</li>}
        {engine.events.map((e) => (
          <li key={e.id} className={`ev ev--${e.kind}`}>
            <time>{e.time}</time>
            <b>{TAGS[e.kind] || e.kind}</b>
            <span>{e.msg}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
