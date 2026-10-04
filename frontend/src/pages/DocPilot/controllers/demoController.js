import { REPO, PR_BRANCH, STEP_DEFS, FINDINGS } from "../data/constants.js";
import { fmtClock, fakeSha, shortPath, fmtN } from "../utils/format.js";
import { makeBatches, pendingHunks, pendingCount, changesIn, batchState } from "../engine/helpers.js";
import { jobStore } from "../store/jobStore.js";

const ENDED = ["done", "alert", "skipped"];

export class DemoController {
  constructor() {
    this.loopId = 0;
    this.last = 0;
    this.timers = new Set();
    this.opts = { speed: 1, paused: false, autopilot: false, secrets: true };
    this.simTime = 0;
    this.t0 = 0;
    this.runId = 0;
    this.waiters = [];
    this.tweens = [];
    this.evId = 0;
    this.toastId = 0;
    this.commitCount = 0;
    this.autoOpened = false;
    this.apDone = 0;
    this.confirmRepo = false;
    this.autoCommit = false;
    this.generating = false;
    this.finished = false;
    this.workers = 6;
    this._onVisible = null;
  }

  start({ simulate = true } = {}) {
    if (this.loopId) return;

    this.last = performance.now();
    this.loopId = setInterval(() => this.frame(performance.now()), 33);

    this._onVisible = () => {
      if (document.visibilityState === "visible") {
        this.last = performance.now();
      }
    };
    document.addEventListener("visibilitychange", this._onVisible);

    if (simulate) {
      this.restart();
    }
  }

  stop() {
    if (this.loopId) {
      clearInterval(this.loopId);
      this.loopId = 0;
    }
    if (this._onVisible) {
      document.removeEventListener("visibilitychange", this._onVisible);
      this._onVisible = null;
    }
    this.runId++;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.waiters = [];
    this.tweens = [];
  }

  restart() {
    this.runId++;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.waiters = [];
    this.tweens = [];

    this.simTime = 0;
    this.t0 = 0;
    this.evId = 0;
    this.toastId = 0;
    this.commitCount = 0;
    this.autoOpened = false;
    this.apDone = 0;
    this.confirmRepo = false;
    this.autoCommit = false;
    this.generating = false;
    this.finished = false;

    const batches = makeBatches();

    jobStore.reset({
      realJob: false,
      batches,
      workers: this.workers,
      opts: { ...this.opts },
      aside: "Waiting for upload",
    });

    this.runPipeline();
    this.autopilotLoop(this.runId);
  }

  setOpt(key, value) {
    this.opts[key] = value;
    jobStore.setState({ opts: { ...this.opts } });
  }

  /* ---------- simulated clock ---------- */
  wait(ms) {
    return new Promise((res) => this.waiters.push({ t: this.simTime + ms, res }));
  }

  tween(ms, fn) {
    return new Promise((res) => this.tweens.push({ s: this.simTime, d: ms, fn, res }));
  }

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

      if (this.generating && !this.finished) {
        this.genTick(sdt);
      }
    }
  }

  /* ---------- generation ---------- */
  genTick(dt) {
    const state = jobStore.getState();
    const batches = state.batches;
    let running = 0;
    const used = new Set();

    for (const b of batches) {
      if (b.status === "generating") {
        running++;
        used.add(b.worker);
      }
    }

    let modified = false;
    const updatedBatches = batches.map((b) => {
      if (running < this.workers && b.status === "queued") {
        let w = 1;
        while (used.has(w)) w++;
        used.add(w);
        running++;
        modified = true;
        if (b.id <= 8 || b.id % 10 === 0) {
          this.log("gen", `Batch ${b.id} sent to worker-${w}, writing docstrings and comments`);
        }
        return { ...b, worker: w, status: "generating" };
      }
      return b;
    });

    const readyBatches = [];
    const finalBatches = updatedBatches.map((b) => {
      if (b.status !== "generating") return b;
      modified = true;
      const nextP = (b.p || 0) + dt / b.dur;
      if (nextP >= 1) {
        readyBatches.push(b);
        return { ...b, p: 1 };
      }
      return { ...b, p: nextP };
    });

    if (modified) {
      jobStore.setState({ batches: finalBatches });
    }

    for (const rb of readyBatches) {
      this.batchReady(rb);
    }

    this.syncGen();
  }

  batchReady(b) {
    const idx = b.id - 1;
    this.log("ready", `Batch ${b.id} result received: ${b.files.length} files, ${changesIn(b)} changes`);

    jobStore.setState((s) => ({
      batches: s.batches.map((item) =>
        item.id === b.id ? { ...item, status: "ready", p: 1, fresh: true } : item
      ),
    }));

    this.later(() => {
      jobStore.setState((s) => ({
        batches: s.batches.map((item) =>
          item.id === b.id ? { ...item, fresh: false } : item
        ),
      }));
    }, 4500);

    if (this.autoCommit) {
      const list = (b.files || []).flatMap((f) => pendingHunks(f));
      const commitMsg = list.length
        ? `docs: batch ${b.id}, ${b.files?.length || 0} files (auto-commit)`
        : b.readme
        ? `docs: batch ${b.id}, README documentation (auto-commit)`
        : `docs: batch ${b.id} (auto-commit)`;

      const sha = this.addCommit(commitMsg, list.length || 1);

      jobStore.setState((s) => {
        const nextBatches = s.batches.map((item) => {
          if (item.id !== b.id) return item;
          return {
            ...item,
            files: (item.files || []).map((f) => ({
              ...f,
              hunks: (f.hunks || []).map((h) => ({
                ...h,
                status: "committed",
                sha,
              })),
            })),
          };
        });
        return { batches: nextBatches };
      });

      this.checkBatchDone(b);
      return;
    }

    const state = jobStore.getState();
    if (state.modal.open) {
      if (state.modal.batch !== idx) {
        jobStore.setState({
          notice: `Batch ${b.id} just finished in the background. It is waiting in your queue.`,
        });
        this.later(() => {
          jobStore.setState({ notice: null });
        }, 5200);
      }
      return;
    }

    if (!this.autoOpened) {
      this.autoOpened = true;
      this.later(() => {
        if (!jobStore.getState().modal.open) {
          this.openModal(idx);
        }
      }, 800);
      return;
    }

    this.notifyReady(b);
  }

  syncGen() {
    if (!this.generating || this.finished) return;
    const c = this.counts();
    const gen = c.ready + c.done;

    const detail =
      gen === REPO.batches
        ? `All ${REPO.batches} generated, ${c.ready} awaiting review`
        : `${gen} of ${REPO.batches} generated, ${c.done} committed`;
    const pct = gen / REPO.batches;
    const aside = `${c.generating} workers busy, ${c.ready} batches waiting for you`;

    jobStore.setState((s) => ({
      aside,
      steps: {
        ...s.steps,
        gen: {
          ...s.steps.gen,
          detail,
          pct,
        },
      },
    }));
  }

  counts() {
    const batches = jobStore.getState().batches;
    let queued = 0;
    let generating = 0;
    let ready = 0;
    let done = 0;

    for (const b of batches) {
      const s = batchState(b);
      const isCommitted =
        s === "done" ||
        s === "committed" ||
        b.status === "done" ||
        b.status === "committed" ||
        (b.files && b.files.length > 0 && pendingCount(b) === 0);

      if (isCommitted) done++;
      else if (s === "queued") queued++;
      else if (s === "generating") generating++;
      else if (s === "ready" || s === "partial") ready++;
    }

    return { queued, generating, ready, done };
  }

  tally() {
    const batches = jobStore.getState().batches;
    let total = 0, committed = 0, skipped = 0, staged = 0;

    for (const b of batches) {
      const isBatchCommitted = b.status === "done" || b.status === "committed";
      let batchHasHunks = false;

      for (const f of b.files || []) {
        for (const h of f.hunks || []) {
          batchHasHunks = true;
          total++;
          if (h.status === "committed" || isBatchCommitted) {
            committed++;
          } else if (h.status === "skipped") {
            skipped++;
          }
        }
      }

      if (!batchHasHunks) {
        const readmeChanges = b.readme ? 1 : 0;
        const totalInBatch = changesIn(b) || readmeChanges || 1;
        total += totalInBatch;
        if (isBatchCommitted) {
          committed += totalInBatch;
        }
      }
    }

    return { total, committed, skipped, staged };
  }

  stepMs(key) {
    const s = jobStore.getState().steps[key];
    if (!s || s.t0 == null) return null;
    return (s.t1 ?? this.simTime) - s.t0;
  }

  setStep(key, state, detail, pct) {
    jobStore.setState((s) => {
      const current = s.steps[key] || {};
      const changed = state && state !== current.state;
      const updated = { ...current };

      if (state) updated.state = state;
      if (changed) {
        if (state === "active" && updated.t0 == null) updated.t0 = this.simTime;
        if (ENDED.includes(state)) {
          if (updated.t0 == null) updated.t0 = this.simTime;
          updated.t1 = this.simTime;
        }
      }
      if (detail != null) updated.detail = detail;
      if (pct != null) updated.pct = pct;

      return {
        steps: {
          ...s.steps,
          [key]: updated,
        },
      };
    });
  }

  setLines(key, lines) {
    jobStore.setState((s) => ({
      steps: {
        ...s.steps,
        [key]: {
          ...s.steps[key],
          lines,
        },
      },
    }));
  }

  log(kind, msg) {
    const id = ++this.evId;
    const time = fmtClock(this.simTime - this.t0);
    jobStore.setState((s) => {
      const nextEvents = [{ id: String(id), time, kind, msg }, ...s.events];
      if (nextEvents.length > 80) nextEvents.length = 80;
      return { events: nextEvents };
    });
  }

  addCommit(msg, n) {
    const sha = fakeSha();
    this.commitCount++;
    const id = sha + this.commitCount;

    jobStore.setState((s) => {
      const nextCommits = [{ id, sha, msg, n }, ...s.commits];
      if (nextCommits.length > 40) nextCommits.length = 40;
      return {
        commits: nextCommits,
        commitCount: this.commitCount,
      };
    });

    return sha;
  }

  toast(t) {
    const id = ++this.toastId;
    jobStore.setState((s) => {
      const nextToasts = [{ id, ts: 0, kind: "info", ...t }, ...s.toasts];
      if (nextToasts.length > 6) nextToasts.length = 6;
      return { toasts: nextToasts };
    });
    return id;
  }

  dismissToast(id) {
    jobStore.setState((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    }));
  }

  notifyReady(b) {
    const state = jobStore.getState();
    const existing = state.toasts.find((x) => x.kind === "ready");

    if (existing) {
      const updatedBatches = [...(existing.batches || []), b.id];
      const nt = { ...existing, batches: updatedBatches, ts: (existing.ts || 0) + 1 };
      this.applyReadyText(nt);
      jobStore.setState((s) => ({
        toasts: s.toasts.map((t) => (t.id === existing.id ? nt : t)),
      }));
    } else {
      const nt = { kind: "ready", batches: [b.id] };
      this.applyReadyText(nt);
      this.toast(nt);
    }
  }

  applyReadyText(t) {
    const ids = [...t.batches].sort((a, b) => a - b);
    const n = ids.length;
    const batches = jobStore.getState().batches;
    t.title = n === 1 ? `Batch ${ids[0]} is ready to review` : `${n} new batches are ready to review`;
    t.text =
      n === 1
        ? `${changesIn(batches[ids[0] - 1])} changes are waiting for you.`
        : `Batches ${ids.slice(0, 4).join(", ")}${n > 4 ? ` and ${n - 4} more` : ""} are waiting for you.`;
    t.action = { label: `Review batch ${ids[0]}`, batch: ids[0] - 1 };
  }

  openModal(i) {
    jobStore.setState((s) => ({
      modal: { open: true, batch: i, animate: true, tab: "changes" },
      confirmRepo: false,
      toasts: s.toasts.filter((t) => t.kind !== "ready"),
    }));
  }

  closeModal() {
    jobStore.setState((s) => ({
      modal: { ...s.modal, open: false },
    }));
  }

  switchBatch(i) {
    jobStore.setState((s) => ({
      modal: { ...s.modal, batch: i, animate: true },
      confirmRepo: false,
      flash: null,
    }));
  }

  gotoPage(p) {
    const state = jobStore.getState();
    const b = state.batches[state.modal.batch];
    if (!b || p < 0 || p >= b.files.length) return;

    jobStore.setState((s) => ({
      batches: s.batches.map((item, idx) =>
        idx === s.modal.batch ? { ...item, page: p } : item
      ),
      modal: { ...s.modal, animate: true },
      flash: null,
    }));
  }

  commitHunk(b, fi, hi) {
    const f = b.files[fi];
    const h = f.hunks[hi];
    if (h.status !== "pending") return;

    const sha = this.addCommit(`docs(${shortPath(f.name)}): ${h.title}`, 1);

    jobStore.setState((s) => {
      const nextBatches = s.batches.map((item) => {
        if (item.id !== b.id) return item;
        return {
          ...item,
          files: item.files.map((file, fileIdx) => {
            if (fileIdx !== fi) return file;
            return {
              ...file,
              hunks: file.hunks.map((hunk, hunkIdx) =>
                hunkIdx === hi ? { ...hunk, status: "committed", sha } : hunk
              ),
            };
          }),
        };
      });

      return {
        batches: nextBatches,
        flash: { b: b.id, f: fi, h: hi },
        modal: { ...s.modal, animate: false },
      };
    });

    this.checkBatchDone(jobStore.getState().batches.find((item) => item.id === b.id));
  }

  skipHunk(b, fi, hi) {
    const h = b.files[fi].hunks[hi];
    if (h.status !== "pending") return;

    jobStore.setState((s) => {
      const nextBatches = s.batches.map((item) => {
        if (item.id !== b.id) return item;
        return {
          ...item,
          files: item.files.map((file, fileIdx) => {
            if (fileIdx !== fi) return file;
            return {
              ...file,
              hunks: file.hunks.map((hunk, hunkIdx) =>
                hunkIdx === hi ? { ...hunk, status: "skipped" } : hunk
              ),
            };
          }),
        };
      });

      return {
        batches: nextBatches,
        flash: null,
        modal: { ...s.modal, animate: false },
      };
    });

    this.checkBatchDone(jobStore.getState().batches.find((item) => item.id === b.id));
  }

  unskipHunk(b, fi, hi) {
    const h = b.files[fi].hunks[hi];
    if (h.status !== "skipped") return;

    jobStore.setState((s) => {
      const nextBatches = s.batches.map((item) => {
        if (item.id !== b.id) return item;
        return {
          ...item,
          status: item.status === "done" ? "ready" : item.status,
          files: item.files.map((file, fileIdx) => {
            if (fileIdx !== fi) return file;
            return {
              ...file,
              hunks: file.hunks.map((hunk, hunkIdx) =>
                hunkIdx === hi ? { ...hunk, status: "pending" } : hunk
              ),
            };
          }),
        };
      });

      return {
        batches: nextBatches,
        modal: { ...s.modal, animate: false },
      };
    });
  }

  commitFile(b, fi) {
    const f = b.files[fi];
    const list = pendingHunks(f);
    if (!list.length) return;

    const sha = this.addCommit(
      `docs: ${f.name}, ${list.length} change${list.length > 1 ? "s" : ""}`,
      list.length
    );

    jobStore.setState((s) => {
      const nextBatches = s.batches.map((item) => {
        if (item.id !== b.id) return item;
        return {
          ...item,
          files: item.files.map((file, fileIdx) => {
            if (fileIdx !== fi) return file;
            return {
              ...file,
              hunks: file.hunks.map((hunk) => ({ ...hunk, status: "committed", sha })),
            };
          }),
        };
      });

      return {
        batches: nextBatches,
        flash: { b: b.id, f: fi, h: null },
        modal: { ...s.modal, animate: false },
      };
    });

    this.checkBatchDone(jobStore.getState().batches.find((item) => item.id === b.id));

    const nx = b.files.findIndex((ff, i) => i > fi && pendingHunks(ff).length);
    if (nx >= 0 && b.status !== "done") {
      this.later(() => {
        const state = jobStore.getState();
        if (state.modal.open && state.batches[state.modal.batch]?.id === b.id) {
          this.gotoPage(nx);
        }
      }, 650);
    }
  }

  commitBatch(b) {
    if (typeof b === "number" || (typeof b === "string" && !isNaN(b))) {
      const num = Number(b);
      const batches = jobStore.getState().batches;
      b = batches.find((x) => x.id === num) || batches[num];
    }
    if (!b) return false;
    if (b.status === "done" || b.status === "committed") return true;

    const list = (b.files || []).flatMap((f) => pendingHunks(f));
    const commitMsg = list.length
      ? `docs: batch ${b.id}, ${b.files?.length || 0} files`
      : b.readme
      ? `docs: batch ${b.id}, README documentation`
      : `docs: batch ${b.id}`;

    const sha = this.addCommit(commitMsg, list.length || 1);

    jobStore.setState((s) => {
      const nextBatches = s.batches.map((item) => {
        if (item.id !== b.id) return item;
        return {
          ...item,
          status: "done",
          fresh: false,
          files: (item.files || []).map((f) => ({
            ...f,
            hunks: (f.hunks || []).map((h) => ({ ...h, status: "committed", sha })),
          })),
        };
      });

      return {
        batches: nextBatches,
        flash: null,
        modal: { ...s.modal, animate: false },
      };
    });

    let c = 0, sk = 0;
    (b.files || []).forEach((f) =>
      (f.hunks || []).forEach((h) => {
        if (h.status === "committed") c++;
        else if (h.status === "skipped") sk++;
      })
    );
    this.log("commit", `Batch ${b.id} finished: ${c} committed${sk ? `, ${sk} skipped` : ""}`);

    const allDone = jobStore.getState().batches.every((x) => x.status === "done" || x.status === "committed");
    if (allDone) {
      this.finish();
    }
    return true;
  }

  requestCommitRepo() {
    if (!this.confirmRepo) {
      this.confirmRepo = true;
      jobStore.setState({ confirmRepo: true });
      this.later(() => {
        if (this.confirmRepo) {
          this.confirmRepo = false;
          jobStore.setState({ confirmRepo: false });
        }
      }, 4000);
    } else {
      this.commitRepo();
    }
  }

  commitRepo() {
    const state = jobStore.getState();
    const ready = state.batches.filter(
      (b) =>
        b.status !== "done" &&
        b.status !== "committed" &&
        (b.status === "ready" || b.status === "partial" || pendingCount(b) > 0 || b.readme)
    );
    const list = ready.flatMap((b) => (b.files || []).flatMap((f) => pendingHunks(f)));

    this.autoCommit = true;
    this.confirmRepo = false;

    if (list.length) {
      const sha = this.addCommit(
        `docs: AI documentation for ${REPO.name}, ${ready.length} batches so far`,
        list.length
      );
      jobStore.setState((s) => ({
        autoCommit: true,
        confirmRepo: false,
        modal: { ...s.modal, open: false },
        batches: s.batches.map((item) => {
          if (!ready.some((r) => r.id === item.id)) return item;
          return {
            ...item,
            status: "done",
            files: (item.files || []).map((f) => ({
              ...f,
              hunks: (f.hunks || []).map((h) => ({ ...h, status: "committed", sha })),
            })),
          };
        }),
      }));
    } else if (ready.length) {
      this.addCommit(
        `docs: AI documentation for ${REPO.name}, ${ready.length} batches so far`,
        ready.length
      );
      jobStore.setState((s) => ({
        autoCommit: true,
        confirmRepo: false,
        modal: { ...s.modal, open: false },
        batches: s.batches.map((item) => {
          if (!ready.some((r) => r.id === item.id)) return item;
          return { ...item, status: "done" };
        }),
      }));
    }

    this.toast({
      kind: "ok",
      title: "Committing the whole repository",
      text: `${list.length || ready.length} changes saved. Every batch that arrives from now on is committed automatically.`,
    });

    for (const b of ready) {
      this.checkBatchDone(b);
    }
  }

  setAutoCommit(on) {
    this.autoCommit = on;
    jobStore.setState({ autoCommit: on });
    if (!on) {
      this.toast({
        kind: "info",
        title: "Auto-commit is off",
        text: "New batches will wait for your review again.",
      });
    }
  }

  checkBatchDone(b) {
    if (b.status === "done" || b.status === "committed") return;
    if (pendingCount(b) > 0) return;

    jobStore.setState((s) => ({
      batches: s.batches.map((item) => (item.id === b.id ? { ...item, status: "done" } : item)),
    }));

    let c = 0, sk = 0;
    (b.files || []).forEach((f) =>
      (f.hunks || []).forEach((h) => {
        if (h.status === "committed") c++;
        else if (h.status === "skipped") sk++;
      })
    );
    this.log("commit", `Batch ${b.id} finished: ${c} committed${sk ? `, ${sk} skipped` : ""}`);

    const state = jobStore.getState();
    const allDone =
      state.batches.length > 0 &&
      state.batches.every((x) => x.status === "done" || x.status === "committed");
    if (allDone) {
      this.finish();
    }
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const t = this.tally();
    const total = REPO.batches;

    this.log("done", `All ${total} batches done. Pull request #482 opened from ${PR_BRANCH}`);
    this.setStep("gen", "done", `${total} of ${total} batches committed`, 1);

    jobStore.setState((s) => ({
      finished: true,
      aside: "Finished",
      modal: { ...s.modal, open: false },
    }));

    this.toast({
      kind: "ok",
      title: "Repository complete",
      text: `${fmtN(t.committed)} changes committed. Pull request #482 is open.`,
    });
  }

  async runPipeline() {
    await this.wait(700);
    this.setStep("upload", "active", "Uploading", 0);
    jobStore.setState({ aside: "Uploading repository" });
    this.log("upload", `Upload started: ${REPO.zip} (${REPO.mb} MB)`);
    await this.tween(2800, (p) =>
      this.setStep("upload", "active", `${(REPO.mb * p).toFixed(1)} of ${REPO.mb} MB`, p)
    );
    this.setLines("upload", [
      `${REPO.zip}, ${REPO.mb} MB`,
      `${fmtN(REPO.files)} files in 214 folders`,
      "Branch main",
    ]);
    this.setStep("upload", "done", `${REPO.mb} MB, ${fmtN(REPO.files)} files`, 1);
    this.log("upload", "Repository uploaded");

    jobStore.setState({ aside: "Sending to server" });
    this.setStep("server", "active", "Connecting to ingest-eu-1", 0.2);
    await this.tween(1300, (p) =>
      this.setStep("server", "active", "Verifying checksum", 0.2 + 0.8 * p)
    );
    this.setLines("server", [
      "Server ingest-eu-1",
      "Job job_8f21c accepted",
      "SHA-256 checksum verified",
    ]);
    this.setStep("server", "done", "ingest-eu-1, job_8f21c", 1);
    this.log("server", "Reached server. Job job_8f21c accepted, checksum verified");

    jobStore.setState({ aside: "Scanning files" });
    this.setStep("scan", "active", `0 of ${fmtN(REPO.files)} files`, 0);
    this.log("scan", `Scanning ${fmtN(REPO.files)} files with secret rules and the code parser`);
    let seg = 0;
    const currentBatches = jobStore.getState().batches;
    await this.tween(3800, (p) => {
      const n = Math.round(REPO.files * p);
      this.setStep("scan", "active", `${fmtN(n)} of ${fmtN(REPO.files)} files`, p);
      const s = Math.floor(p * 5);
      if (s > seg) {
        seg = s;
        this.log(
          "scan",
          `${fmtN(n)} files checked, last: ${
            currentBatches[Math.min(currentBatches.length - 1, Math.floor(p * 100))]?.files[0]?.name
          }`
        );
      }
    });
    this.setLines("scan", [
      `${fmtN(REPO.files)} Python files parsed`,
      "Secret rules and code parser applied",
      "No files skipped",
    ]);
    this.setStep("scan", "done", `${fmtN(REPO.files)} files scanned`, 1);

    jobStore.setState({ aside: "Checking for sensitive data" });
    this.setStep("secrets", "active", "Reviewing findings", 0.5);
    await this.wait(900);

    if (this.opts.secrets) {
      for (const f of FINDINGS) {
        this.log("secret", `${f.type} found in ${f.file}:${f.line}`);
        await this.wait(280);
      }
      const files = new Set(FINDINGS.map((f) => f.file)).size;
      this.setLines("secrets", FINDINGS.map((f) => `${f.type} in ${f.file}:${f.line}`));
      this.setStep("secrets", "alert", `Yes: ${FINDINGS.length} secrets in ${files} files`, 1);
      await this.wait(700);

      jobStore.setState({ aside: "Applying security changes" });
      this.setStep("secure", "active", `Redacted 0 of ${FINDINGS.length}`, 0);
      this.log("secure", "Applying security changes: swapping secrets for placeholders");
      let done = 0;
      await this.tween(2800, (p) => {
        const n = Math.floor(p * FINDINGS.length);
        while (done < n) {
          const f = FINDINGS[done];
          this.log("secure", `${f.file} now uses ${f.repl}`);
          done++;
        }
        this.setStep("secure", "active", `Redacted ${n} of ${FINDINGS.length}`, p);
      });
      this.log("secure", "Outbound check passed: 0 secrets in prompts sent to the model");
      this.setLines("secure", [
        ...FINDINGS.map((f) => `${f.file}: ${f.repl}`),
        "Outbound check passed: 0 secrets in model prompts",
      ]);
      this.setStep("secure", "done", `${FINDINGS.length} secrets redacted`, 1);
      this.toast({
        kind: "warn",
        title: `${FINDINGS.length} secrets found and removed`,
        text: "They were replaced with placeholders before anything was sent to the model.",
      });
    } else {
      this.setStep("secrets", "done", "No: nothing sensitive found", 1);
      this.log("scan", "No sensitive data found");
      this.setStep("secure", "skipped", "Skipped, nothing to redact", 1);
      await this.wait(600);
    }

    jobStore.setState({ aside: "Creating batches" });
    this.setStep("batch", "active", `0 of ${REPO.batches} batches`, 0);
    this.log("batch", `Splitting ${fmtN(REPO.files)} files into batches of ${REPO.per}`);
    await this.tween(2400, (p) => {
      const n = Math.round(REPO.batches * p);
      this.setStep("batch", "active", `${n} of ${REPO.batches} batches`, p);
    });
    this.setStep("batch", "done", `${REPO.batches} batches of ${REPO.per} files`, 1);
    this.log("batch", `${REPO.batches} batches created and queued`);

    await this.wait(500);
    this.generating = true;
    jobStore.setState({ generating: true });
    this.setStep("gen", "active", "Starting workers", 0);
    this.log("gen", `Worker pool online with ${this.workers} concurrent workers`);
  }

  async autopilotLoop(my) {
    while (my === this.runId) {
      await this.wait(600);
      if (my !== this.runId) return;
      if (this.opts.autopilot && this.generating) {
        this.apStep();
      }
    }
  }

  apStep() {
    if (this.autoCommit) {
      if (jobStore.getState().modal.open) this.closeModal();
      return;
    }

    const state = jobStore.getState();
    const batches = state.batches;

    if (!state.modal.open) {
      const nx = batches.findIndex(
        (b) =>
          b.status !== "done" &&
          b.status !== "committed" &&
          (b.status === "ready" || batchState(b) === "partial") &&
          pendingCount(b) > 0
      );
      if (nx >= 0) this.openModal(nx);
      return;
    }

    const b = batches[state.modal.batch];
    if (!b || b.status === "done" || b.status === "committed") {
      this.apDone++;
      const nx = batches.findIndex(
        (x) =>
          x.status !== "done" &&
          x.status !== "committed" &&
          (x.status === "ready" || batchState(x) === "partial") &&
          pendingCount(x) > 0
      );
      if (nx >= 0) this.openModal(nx);
      else this.closeModal();
      return;
    }

    const phase = this.apDone;
    if (phase >= 3) {
      if (!this.confirmRepo) {
        this.confirmRepo = true;
        jobStore.setState({ confirmRepo: true });
        return;
      }
      this.commitRepo();
      return;
    }

    if (phase === 2) {
      if (!b.apSeen) {
        jobStore.setState((s) => ({
          batches: s.batches.map((item) =>
            item.id === b.id ? { ...item, apSeen: true } : item
          ),
        }));
        return;
      }
      this.commitBatch(b);
      return;
    }

    const f = b.files[b.page || 0];
    const pend = (f.hunks || [])
      .map((h, i) => (h.status === "pending" ? i : -1))
      .filter((i) => i >= 0);

    if (pend.length) {
      if (phase === 1) {
        this.commitFile(b, b.page || 0);
        return;
      }
      if (Math.random() < 0.08 && pend.length > 1) {
        this.skipHunk(b, b.page || 0, pend[0]);
      } else {
        this.commitHunk(b, b.page || 0, pend[0]);
      }
      return;
    }

    const nx = b.files.findIndex((ff) => pendingHunks(ff).length);
    if (nx >= 0) this.gotoPage(nx);
  }
}

export const demoController = new DemoController();
