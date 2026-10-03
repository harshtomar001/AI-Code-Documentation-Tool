import './Badge.css';

/** Android-style notification count. Re-mounts (and pops) whenever the count changes. */
export default function Badge({ count, variant = '', label }) {
  if (!count) return null;
  console.log(count);
  return (
    <span key={count} className={`badge ${variant ? `badge--${variant}` : ''}`} aria-label={label || `${count} waiting`}>
      {count}
    </span>
  );
}
