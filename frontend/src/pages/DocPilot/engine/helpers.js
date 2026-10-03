import { DIRS, REPO } from '../data/constants.js';
import { TEMPLATES } from '../data/samples.js';

export const pendingHunks = (f) => f.hunks.filter((h) => h.status === 'pending');
export const pendingCount = (b) => b.files.reduce((n, f) => n + pendingHunks(f).length, 0);
export const changesIn = (b) => b.files.reduce((n, f) => n + f.hunks.length, 0);

/** One of: queued, generating, ready, partial, done */
export function batchState(b) {
  if (!b) return 'queued';
  if (b.status === 'done' || b.status === 'committed') return 'done';
  if (b.files && b.files.length > 0 && pendingCount(b) === 0 && (b.status === 'ready' || b.status === 'partial'))
    return 'done';
  if (b.status === 'ready' && b.files && b.files.some((f) => f.hunks.some((h) => h.status !== 'pending')))
    return 'partial';
  return b.status;
}


function makeFile(g) {
  const t = TEMPLATES[g % TEMPLATES.length];
  const dir = DIRS[(g * 5 + Math.floor(g / 8)) % DIRS.length];
  return {
    name: `${dir}/${t.mod}.py`,
    hunks: t.hunks.map((h, k) => ({
      title: h.title,
      rows: h.rows,
      start: 8 + ((g * 7 + k * 23) % 60),
      status: 'pending', // pending | committed | skipped
      sha: null,
    })),
  };
}

export function makeBatches() {
  return Array.from({ length: REPO.batches }, (_, b) => ({
    id: b + 1,
    status: 'queued', // queued | generating | ready | done
    p: 0,
    worker: 0,
    fresh: false,
    page: 0,
    apSeen: false,
    // first batches finish quickly so the popup appears soon
    dur: b === 0 ? 4500 : b === 1 ? 6800 : b === 2 ? 8200 : b === 3 ? 9800 : 6000 + Math.random() * 6500,
    files: Array.from({ length: REPO.per }, (_, i) => makeFile(b * REPO.per + i)),
  }));
}
