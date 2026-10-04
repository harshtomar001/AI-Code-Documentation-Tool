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

/** Deterministic 7-char hex id from a seed (stable across refreshes, unlike fakeSha). */
export function stableSha(seed) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')).slice(0, 7);
}

/** 14:03:22 (24h, local) */
export function clockNow(ts = Date.now()) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/** 3m ago, 12s ago */
export function fmtAgo(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
