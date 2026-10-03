export const fmtN = (n) => n.toLocaleString('en-US');

/** 12s, 1m 24s */
export function fmtDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** 00:53.3 */
export function fmtClock(ms) {
  const t = Math.max(0, ms) / 1000;
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(1).padStart(4, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
}

export const shortPath = (p) => p.split('/').slice(-2).join('/');

export const fakeSha = () =>
  Array.from({ length: 7 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

/** Turns "a **b** c" into segments: [{t:'a ',b:false},{t:'b',b:true},...] */
export function boldSegments(str) {
  return str.split('**').map((t, i) => ({ t, b: i % 2 === 1 }));
}
