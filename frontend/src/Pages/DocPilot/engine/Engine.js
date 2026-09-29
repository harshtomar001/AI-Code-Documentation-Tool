import { REPO, PR_BRANCH, STEP_DEFS, FINDINGS } from '../data/constants.js';
import { fmtClock, fakeSha, shortPath, fmtN } from '../utils/format.js';
import { makeBatches, pendingHunks, pendingCount, changesIn } from './helpers.js';

const ENDED = ['done', 'alert', 'skipped'];

/**
 * The fake "backend". It owns all demo state and runs the scripted pipeline on a
 * simulated clock (so pause and 1x/2x/4x/8x speed work everywhere).
 *
 * React reads it through useEngine(); every change bumps `version`.
 * In a real product this class is replaced by an API client + an SSE/WebSocket stream.
 */
export class Engine {
  constructor() {
    this.listeners = new Set();
    this.version = 0;
    this._raf = 0;
    this._dirty = false;
    this._lastEmit = 0;
    this.loopId = 0;
    this.last = 0;
    this.timers = new Set();
    this.opts = { speed: 1, paused: false, autopilot: false, secrets: true };
    this.simTime = 0;
    this.runId = 0;
    this.waiters = [];
    this.tweens = [];
    this.evId = 0;
    this.toastId = 0;
    this.init();
  }

  /* ---------- store plumbing ---------- */
  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;

  emit() {
    this._dirty = false;
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._lastEmit = performance.now();
      this.syncGen();
      this.version++;
      this.listeners.forEach((l) => l());
    });
  }
  /** Cheap, throttled notification for high-frequency changes (progress bars). */
  softEmit() {
    this._dirty = true;
  }

  init() {
    this.t0 = this.simTime;
    this.batches = makeBatches();
    this.steps = Object.fromEntries(
      STEP_DEFS.map((d) => [d.key, { state: 'pending', detail: d.idle, pct: 0, t0: null, t1: null, lines: [] }]),
    );
    this.events = [];
    this.commits = [];
    this.toasts = [];
    this.workers = 6;
    this.generating = false;
    this.finished = false;
    this.autoCommit = false;
    this.autoOpened = false;
    this.apDone = 0;
    this.commitCount = 0;
    this.flash = null;
    this.notice = null;
    this.confirmRepo = false;
    this.aside = 'Waiting for upload';
    this.modal = { open: false, batch: 0, animate: false };
  }

  /* ---------- lifecycle ---------- */
  start() {
    if (this.loopId) return;
    this.last = performance.now();
    const frame = (ts) => {
      this.loopId = requestAnimationFrame(frame);
      this.frame(ts);
    };
    this.loopId = requestAnimationFrame(frame);
    this.restart();
  }
  stop() {
    cancelAnimationFrame(this.loopId);
    this.loopId = 0;
    this.runId++;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
  restart() {
    this.runId++;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.waiters = [];
    this.tweens = [];
    this.init();
    this.emit();
    this.runPipeline();
    this.autopilotLoop(this.runId);
  }
  setOpt(key, value) {
    this.opts[key] = value;
    this.emit();
  }

  /* ---------- simulated clock ---------- */
  wait(ms) {
    return new Promise((res) => this.waiters.push({ t: this.simTime + ms, res }));
  }
  tween(ms, fn) {
    return new Promise((res) => this.tweens.push({ s: this.simTime, d: ms, fn, res }));
  }
  /** Real-time timer that is cancelled on restart. */
  later(fn, ms) {
    const my = this.runId;
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (my === this.runId) fn();
    }, ms);
    this.timers.add(id);
  }
  frame(ts) {
    const dt = Math.min(100, ts - this.last);
    this.last = ts;
    if (!this.opts.paused) {
      const sdt = dt * this.opts.speed;
      this.simTime += sdt;
      for (const tw of this.tweens.slice()) {
        const p = Math.min(1, (this.simTime - tw.s) / tw.d);
        tw.fn(p);
        if (p >= 1) {
          this.tweens.splice(this.tweens.indexOf(tw), 1);
          tw.res();
        }
      }
      const due = this.waiters.filter((w) => w.t <= this.simTime);
      if (due.length) {
        this.waiters = this.waiters.filter((w) => w.t > this.simTime);
        due.forEach((w) => w.res());
      }
      if (this.generating && !this.finished) this.genTick(sdt);
    }
    if (this._dirty && ts - this._lastEmit >= 90) this.emit();
  }

  /* ---------- derived data ---------- */
  counts() {
    let queued = 0, generating = 0, ready = 0, done = 0;
    for (const b of this.batches) {
      if (b.status === 'queued') queued++;
      else if (b.status === 'generating') generating++;
      else if (b.status === 'ready') ready++;
      else done++;
    }
    return { queued, generating, ready, done };
  }
  tally() {
    let total = 0, committed = 0, skipped = 0;
    for (const b of this.batches)
      for (const f of b.files)
        for (const h of f.hunks) {
          total++;
          if (h.status === 'committed') committed++;
          else if (h.status === 'skipped') skipped++;
        }
    return { total, committed, skipped };
  }
  stepMs(key) {
    const s = this.steps[key];
    if (s.t0 == null) return null;
    return (s.t1 ?? this.simTime) - s.t0;
  }
  syncGen() {
    if (!this.generating || this.finished) return;
    const c = this.counts();
    const gen = c.ready + c.done;
    this.steps.gen.detail =
      gen === REPO.batches
        ? `All ${REPO.batches} generated, ${c.ready} awaiting review`
        : `${gen} of ${REPO.batches} generated, ${c.done} committed`;
    this.steps.gen.pct = gen / REPO.batches;
    this.aside = `${c.generating} workers busy, ${c.ready} batches waiting for you`;
  }

  /* ---------- steps, events, commits, toasts ---------- */
  setStep(key, state, detail, pct) {
    const s = this.steps[key];
    const changed = state && state !== s.state;
    if (state) s.state = state;
    if (changed) {
      if (state === 'active' && s.t0 == null) s.t0 = this.simTime;
      if (ENDED.includes(state)) {
        if (s.t0 == null) s.t0 = this.simTime;
        s.t1 = this.simTime;
      }
    }
    if (detail != null) s.detail = detail;
    if (pct != null) s.pct = pct;
    if (changed) this.emit();
    else this.softEmit();
  }
  setLines(key, lines) {
    this.steps[key].lines = lines;
  }
  log(kind, msg) {
    this.events.unshift({ id: ++this.evId, time: fmtClock(this.simTime - this.t0), kind, msg });
    if (this.events.length > 80) this.events.length = 80;
    this.emit();
  }
  addCommit(msg, n) {
    const sha = fakeSha();
    this.commitCount++;
    this.commits.unshift({ id: sha + this.commitCount, sha, msg, n });
    if (this.commits.length > 40) this.commits.length = 40;
    return sha;
  }
  toast(t) {
    const id = ++this.toastId;
    this.toasts.unshift({ id, ts: 0, kind: 'info', ...t });
    if (this.toasts.length > 6) this.toasts.length = 6;
    this.emit();
    return id;
  }
  dismissToast(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
  }
  /** One merged "ready to review" notification instead of a stack of 20. */
  notifyReady(b) {
    const t = this.toasts.find((x) => x.kind === 'ready');
    if (t) {
      t.batches.push(b.id);
      t.ts++;
      this.applyReadyText(t);
      this.emit();
    } else {
      const nt = { kind: 'ready', batches: [b.id] };
      this.applyReadyText(nt);
      this.toast(nt);
    }
  }
  applyReadyText(t) {
    const ids = [...t.batches].sort((a, b) => a - b);
    const n = ids.length;
    t.title = n === 1 ? `Batch ${ids[0]} is ready to review` : `${n} new batches are ready to review`;
    t.text =
      n === 1
        ? `${changesIn(this.batches[ids[0] - 1])} changes are waiting for you.`
        : `Batches ${ids.slice(0, 4).join(', ')}${n > 4 ? ` and ${n - 4} more` : ''} are waiting for you.`;
    t.action = { label: `Review batch ${ids[0]}`, batch: ids[0] - 1 };
  }

  /* ---------- generation ---------- */
  genTick(dt) {
    let running = 0;
    const used = new Set();
    for (const b of this.batches)
      if (b.status === 'generating') { running++; used.add(b.worker); }
    for (const b of this.batches) {
      if (running >= this.workers) break;
      if (b.status === 'queued') {
        let w = 1;
        while (used.has(w)) w++;
        used.add(w);
        b.worker = w;
        b.status = 'generating';
        running++;
        if (b.id <= 8 || b.id % 10 === 0)
          this.log('gen', `Batch ${b.id} sent to worker-${w}, writing docstrings and comments`);
        this.softEmit();
      }
    }
    let any = false;
    for (const b of this.batches) {
      if (b.status !== 'generating') continue;
      any = true;
      b.p += dt / b.dur;
      if (b.p >= 1) this.batchReady(b);
    }
    if (any) this.softEmit();
  }

  batchReady(b) {
    const idx = b.id - 1;
    b.status = 'ready';
    b.p = 1;
    b.fresh = true;
    this.later(() => { b.fresh = false; this.emit(); }, 4500);
    this.log('ready', `Batch ${b.id} result received: ${b.files.length} files, ${changesIn(b)} changes`);

    if (this.autoCommit) {
      const list = b.files.flatMap((f) => pendingHunks(f));
      const sha = this.addCommit(`docs: batch ${b.id}, ${b.files.length} files (auto-commit)`, list.length);
      list.forEach((h) => { h.status = 'committed'; h.sha = sha; });
      this.checkBatchDone(b);
      return;
    }
    if (this.modal.open) {
      if (this.modal.batch !== idx) {
        this.notice = `Batch ${b.id} just finished in the background. It is waiting in your queue.`;
        this.later(() => { this.notice = null; this.emit(); }, 5200);
      }
      return;
    }
    if (!this.autoOpened) {
      // the very first result opens the review popup by itself
      this.autoOpened = true;
      this.later(() => { if (!this.modal.open) this.openModal(idx); }, 800);
      return;
    }
    this.notifyReady(b);
  }

  /* ---------- review popup actions ---------- */
  openModal(i) {
    this.modal = { open: true, batch: i, animate: true };
    this.confirmRepo = false;
    this.toasts = this.toasts.filter((t) => t.kind !== 'ready');
    this.emit();
  }
  closeModal() {
    this.modal.open = false;
    this.emit();
  }
  switchBatch(i) {
    this.modal.batch = i;
    this.modal.animate = true;
    this.confirmRepo = false;
    this.flash = null;
    this.emit();
  }
  gotoPage(p) {
    const b = this.batches[this.modal.batch];
    if (!b || p < 0 || p >= b.files.length) return;
    b.page = p;
    this.modal.animate = true;
    this.flash = null;
    this.emit();
  }
  afterCommit(b) {
    this.modal.animate = false;
    this.checkBatchDone(b);
    this.emit();
  }
  commitHunk(b, fi, hi) {
    const f = b.files[fi], h = f.hunks[hi];
    if (h.status !== 'pending') return;
    h.sha = this.addCommit(`docs(${shortPath(f.name)}): ${h.title}`, 1);
    h.status = 'committed';
    this.flash = { b: b.id, f: fi, h: hi };
    this.afterCommit(b);
  }
  skipHunk(b, fi, hi) {
    const h = b.files[fi].hunks[hi];
    if (h.status !== 'pending') return;
    h.status = 'skipped';
    this.flash = null;
    this.afterCommit(b);
  }
  unskipHunk(b, fi, hi) {
    const h = b.files[fi].hunks[hi];
    if (h.status !== 'skipped') return;
    h.status = 'pending';
    if (b.status === 'done') b.status = 'ready';
    this.afterCommit(b);
  }
  commitFile(b, fi) {
    const f = b.files[fi], list = pendingHunks(f);
    if (!list.length) return;
    const sha = this.addCommit(`docs: ${f.name}, ${list.length} change${list.length > 1 ? 's' : ''}`, list.length);
    list.forEach((h) => { h.status = 'committed'; h.sha = sha; });
    this.flash = { b: b.id, f: fi, h: null };
    this.afterCommit(b);
    // jump to the next file that still has something to review
    const nx = b.files.findIndex((ff, i) => i > fi && pendingHunks(ff).length);
    if (nx >= 0 && b.status !== 'done') {
      this.later(() => {
        if (this.modal.open && this.batches[this.modal.batch] === b) this.gotoPage(nx);
      }, 650);
    }
  }
  commitBatch(b) {
    const list = b.files.flatMap((f) => pendingHunks(f));
    if (!list.length) return;
    const sha = this.addCommit(`docs: batch ${b.id}, ${b.files.length} files`, list.length);
    list.forEach((h) => { h.status = 'committed'; h.sha = sha; });
    this.flash = null;
    this.afterCommit(b);
  }
  /** First click asks to confirm, second click commits everything ready now and auto-commits the rest. */
  requestCommitRepo() {
    if (!this.confirmRepo) {
      this.confirmRepo = true;
      this.emit();
      this.later(() => { if (this.confirmRepo) { this.confirmRepo = false; this.emit(); } }, 4000);
    } else this.commitRepo();
  }
  commitRepo() {
    const ready = this.batches.filter((b) => b.status === 'ready');
    const list = ready.flatMap((b) => b.files.flatMap((f) => pendingHunks(f)));
    this.autoCommit = true;
    this.confirmRepo = false;
    if (list.length) {
      const sha = this.addCommit(`docs: AI documentation for ${REPO.name}, ${ready.length} batches so far`, list.length);
      list.forEach((h) => { h.status = 'committed'; h.sha = sha; });
    }
    ready.forEach((b) => this.checkBatchDone(b));
    this.modal.open = false;
    this.toast({
      kind: 'ok',
      title: 'Committing the whole repository',
      text: `${list.length} changes saved. Every batch that arrives from now on is committed automatically.`,
    });
  }
  setAutoCommit(on) {
    this.autoCommit = on;
    if (!on) this.toast({ kind: 'info', title: 'Auto-commit is off', text: 'New batches will wait for your review again.' });
    this.emit();
  }
  checkBatchDone(b) {
    if (b.status !== 'ready' || pendingCount(b) > 0) return;
    b.status = 'done';
    let c = 0, s = 0;
    b.files.forEach((f) => f.hunks.forEach((h) => { if (h.status === 'committed') c++; else if (h.status === 'skipped') s++; }));
    this.log('commit', `Batch ${b.id} finished: ${c} committed${s ? `, ${s} skipped` : ''}`);
    if (this.batches.every((x) => x.status === 'done')) this.finish();
  }
  finish() {
    if (this.finished) return;
    this.finished = true;
    const t = this.tally();
    this.log('done', `All ${REPO.batches} batches done. Pull request #482 opened from ${PR_BRANCH}`);
    this.setStep('gen', 'done', `${REPO.batches} of ${REPO.batches} batches committed`, 1);
    this.aside = 'Finished';
    this.toast({
      kind: 'ok',
      title: 'Repository complete',
      text: `${fmtN(t.committed)} changes committed. Pull request #482 is open.`,
    });
    this.modal.open = false;
    this.emit();
  }

  /* ---------- the scripted pipeline ---------- */
  async runPipeline() {
    const D = this;
    await D.wait(700);
    D.setStep('upload', 'active', 'Uploading', 0);
    D.aside = 'Uploading repository';
    D.log('upload', `Upload started: ${REPO.zip} (${REPO.mb} MB)`);
    await D.tween(2800, (p) => D.setStep('upload', 'active', `${(REPO.mb * p).toFixed(1)} of ${REPO.mb} MB`, p));
    D.setLines('upload', [`${REPO.zip}, ${REPO.mb} MB`, `${fmtN(REPO.files)} files in 214 folders`, 'Branch main']);
    D.setStep('upload', 'done', `${REPO.mb} MB, ${fmtN(REPO.files)} files`, 1);
    D.log('upload', 'Repository uploaded');

    D.aside = 'Sending to server';
    D.setStep('server', 'active', 'Connecting to ingest-eu-1', 0.2);
    await D.tween(1300, (p) => D.setStep('server', 'active', 'Verifying checksum', 0.2 + 0.8 * p));
    D.setLines('server', ['Server ingest-eu-1', 'Job job_8f21c accepted', 'SHA-256 checksum verified']);
    D.setStep('server', 'done', 'ingest-eu-1, job_8f21c', 1);
    D.log('server', 'Reached server. Job job_8f21c accepted, checksum verified');

    D.aside = 'Scanning files';
    D.setStep('scan', 'active', `0 of ${fmtN(REPO.files)} files`, 0);
    D.log('scan', `Scanning ${fmtN(REPO.files)} files with secret rules and the code parser`);
    let seg = 0;
    await D.tween(3800, (p) => {
      const n = Math.round(REPO.files * p);
      D.setStep('scan', 'active', `${fmtN(n)} of ${fmtN(REPO.files)} files`, p);
      const s = Math.floor(p * 5);
      if (s > seg) {
        seg = s;
        D.log('scan', `${fmtN(n)} files checked, last: ${D.batches[Math.min(99, Math.floor(p * 100))].files[0].name}`);
      }
    });
    D.setLines('scan', [`${fmtN(REPO.files)} Python files parsed`, 'Secret rules and code parser applied', 'No files skipped']);
    D.setStep('scan', 'done', `${fmtN(REPO.files)} files scanned`, 1);

    D.aside = 'Checking for sensitive data';
    D.setStep('secrets', 'active', 'Reviewing findings', 0.5);
    await D.wait(900);
    if (D.opts.secrets) {
      for (const f of FINDINGS) {
        D.log('secret', `${f.type} found in ${f.file}:${f.line}`);
        await D.wait(280);
      }
      const files = new Set(FINDINGS.map((f) => f.file)).size;
      D.setLines('secrets', FINDINGS.map((f) => `${f.type} in ${f.file}:${f.line}`));
      D.setStep('secrets', 'alert', `Yes: ${FINDINGS.length} secrets in ${files} files`, 1);
      await D.wait(700);
      D.aside = 'Applying security changes';
      D.setStep('secure', 'active', `Redacted 0 of ${FINDINGS.length}`, 0);
      D.log('secure', 'Applying security changes: swapping secrets for placeholders');
      let done = 0;
      await D.tween(2800, (p) => {
        const n = Math.floor(p * FINDINGS.length);
        while (done < n) {
          const f = FINDINGS[done];
          D.log('secure', `${f.file} now uses ${f.repl}`);
          done++;
        }
        D.setStep('secure', 'active', `Redacted ${n} of ${FINDINGS.length}`, p);
      });
      D.log('secure', 'Outbound check passed: 0 secrets in prompts sent to the model');
      D.setLines('secure', [
        ...FINDINGS.map((f) => `${f.file}: ${f.repl}`),
        'Outbound check passed: 0 secrets in model prompts',
      ]);
      D.setStep('secure', 'done', `${FINDINGS.length} secrets redacted`, 1);
      D.toast({
        kind: 'warn',
        title: `${FINDINGS.length} secrets found and removed`,
        text: 'They were replaced with placeholders before anything was sent to the model.',
      });
    } else {
      D.setStep('secrets', 'done', 'No: nothing sensitive found', 1);
      D.log('scan', 'No sensitive data found');
      D.setStep('secure', 'skipped', 'Skipped, nothing to redact', 1);
      await D.wait(600);
    }

    D.aside = 'Creating batches';
    D.setStep('batch', 'active', `0 of ${REPO.batches} batches`, 0);
    D.log('batch', `Splitting ${fmtN(REPO.files)} files into batches of ${REPO.per}`);
    await D.tween(2400, (p) => {
      const n = Math.round(REPO.batches * p);
      D.setStep('batch', 'active', `${n} of ${REPO.batches} batches`, p);
    });
    D.setStep('batch', 'done', `${REPO.batches} batches of ${REPO.per} files`, 1);
    D.log('batch', `${REPO.batches} batches created and queued`);

    await D.wait(500);
    D.generating = true;
    D.setStep('gen', 'active', 'Starting workers', 0);
    D.log('gen', `Worker pool online with ${D.workers} concurrent workers`);
  }

  /* ---------- optional hands-free demo ---------- */
  async autopilotLoop(my) {
    while (my === this.runId) {
      await this.wait(600);
      if (my !== this.runId) return;
      if (this.opts.autopilot && this.generating) this.apStep();
    }
  }
  apStep() {
    if (this.autoCommit) { if (this.modal.open) this.closeModal(); return; }
    if (!this.modal.open) {
      const nx = this.batches.findIndex((b) => b.status === 'ready');
      if (nx >= 0) this.openModal(nx);
      return;
    }
    const b = this.batches[this.modal.batch];
    if (b.status === 'done') {
      this.apDone++;
      const nx = this.batches.findIndex((x) => x.status === 'ready');
      if (nx >= 0) this.openModal(nx); else this.closeModal();
      return;
    }
    const phase = this.apDone;
    if (phase >= 3) {
      if (!this.confirmRepo) { this.confirmRepo = true; this.emit(); return; }
      this.commitRepo();
      return;
    }
    if (phase === 2) {
      if (!b.apSeen) { b.apSeen = true; return; }
      this.commitBatch(b);
      return;
    }
    const f = b.files[b.page];
    const pend = f.hunks.map((h, i) => (h.status === 'pending' ? i : -1)).filter((i) => i >= 0);
    if (pend.length) {
      if (phase === 1) { this.commitFile(b, b.page); return; }
      if (Math.random() < 0.08 && pend.length > 1) this.skipHunk(b, b.page, pend[0]);
      else this.commitHunk(b, b.page, pend[0]);
      return;
    }
    const nx = b.files.findIndex((ff) => pendingHunks(ff).length);
    if (nx >= 0) this.gotoPage(nx);
  }
}
