function Box({ x, y, title, sub, keyBox }) {
  return (
    <g>
      <rect className={`bx ${keyBox ? 'bx--key' : ''}`} x={x} y={y} width="150" height="56" rx="8" />
      <text className="t1" x={x + 75} y={y + 25} textAnchor="middle">{title}</text>
      <text className="t2" x={x + 75} y={y + 42} textAnchor="middle">{sub}</text>
    </g>
  );
}
const Arrow = ({ d }) => <path className="ar" d={d} markerEnd="url(#ah)" />;
const Label = ({ x, y, children, anchor }) => <text className="lb" x={x} y={y} textAnchor={anchor}>{children}</text>;

export default function ArchDiagram() {
  return (
    <svg viewBox="0 0 820 340" role="img" aria-label="Architecture diagram: client, API, orchestrator, job queue, worker pool, patch store, event stream, git provider">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0L10 5L0 10z" className="ah" />
        </marker>
      </defs>
      <Box x={20} y={40} title="Web client" sub="upload, review, commit" />
      <Box x={230} y={40} title="API gateway" sub="auth, signed uploads" />
      <Box x={440} y={40} title="Orchestrator" sub="job state machine" />
      <Box x={650} y={40} title="Git provider" sub="branch and pull request" />
      <Box x={230} y={150} title="Object store" sub="repo archive" />
      <Box x={440} y={150} title="Job queue" sub="one job per batch" keyBox />
      <Box x={650} y={150} title="Worker pool" sub="scan, redact, generate" />
      <Box x={20} y={260} title="Event stream" sub="SSE or WebSocket" keyBox />
      <Box x={440} y={260} title="Patch store" sub="status per change" keyBox />
      <Box x={650} y={260} title="LLM provider" sub="redacted context only" />
      <Arrow d="M170 68H228" />
      <Arrow d="M380 68H438" /><Label x={409} y={60} anchor="middle">create job</Label>
      <Arrow d="M590 68H648" /><Label x={619} y={60} anchor="middle">commit</Label>
      <Arrow d="M305 96V148" />
      <Arrow d="M515 96V148" /><Label x={524} y={126}>enqueue</Label>
      <Arrow d="M590 178H648" />
      <Arrow d="M725 206V258" /><Label x={733} y={236}>prompt</Label>
      <Arrow d="M672 206L592 264" /><Label x={600} y={232}>patch</Label>
      <Arrow d="M440 288H172" /><Label x={306} y={280} anchor="middle">batch.ready</Label>
      <Arrow d="M95 258V98" /><Label x={103} y={180}>push</Label>
    </svg>
  );
}
