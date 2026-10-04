import { REPO, PR_BRANCH, STEP_DEFS, FINDINGS } from '../data/constants.js';
import { fmtClock, fakeSha, shortPath, fmtN, stableSha, clockNow } from '../utils/format.js';
import { makeBatches, pendingHunks, pendingCount, changesIn, batchState } from './helpers.js';
import {
  startProjectJob,
  fetchJob,
  fetchJobBatches,
  fetchBatch,
  subscribeToJob,
  downloadJobArchive,
  commitJobBatch,
  commitAllJobBatches,
  fetchJobCommits,
} from "../api/docPilotJobs.js";

import { normalizeBatch, normalizeBatches, extractCommitInfo, normalizeCommit } from '../utils/batchAdapter.js';
import { getToken } from '../../../utils/getToken.js';

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
    this._emitTimer = 0;
    this._onVisible = null;
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
    this.realJob = false;
    this.jobId = null;
    this.projectId = null;
    this.jobStatus = null;
    this.jobEventSource = null;
    this.pollInterval = null;
    this.totalBatches = 0;
    this.repositoryName = null;
    this.jobError = null;
    this._refreshSeq = 0;
    this._refreshTimer = 0;
    this._lastSseAt = 0;
    this._lastJobMessage = null;
    this._sseRetry = 0;
    this._autoCommitRunning = false;
    this.recordedCommits = [];
    this.serverCommits = null;
    this.init();
  }

  /* ---------- store plumbing ---------- */
  subscribe = (fn) => {
    this.listeners.add(fn);

    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.version;

  /**
   * Notify React. Uses a coalescing setTimeout, NOT requestAnimationFrame:
   * rAF is paused in hidden/occluded tabs, which left the UI stale until the
   * user switched back to the window.
   */
  emit() {
    this._dirty = false;
    if (this._emitTimer) return;
    this._emitTimer = setTimeout(() => this.flush(), 0);
  }

  flush() {
    this._emitTimer = 0;
    this._dirty = false;
    this._lastEmit = performance.now();
    this.syncGen();
    this.version++;

    this.listeners.forEach((l) => l());
  }
  /** Cheap, throttled notification for high-frequency changes (progress bars). */
  softEmit() {
    this._dirty = true;
  }

  init() {
  this.t0 = this.simTime;

  this.batches = makeBatches();

  // Tracks batches currently waiting for backend commit response.
  this.committingBatchIds = new Set();
  this.committedBatchIds = new Set();


  this.steps = Object.fromEntries(
    STEP_DEFS.map((d) => [
      d.key,
      {
        state: "pending",
        detail: d.idle,
        pct: 0,
        t0: null,
        t1: null,
        lines: [],
      },
    ]),
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
  this.aside = "Waiting for upload";
  this.modal = {
    open: false,
    batch: 0,
    animate: false,
  };
}

  isBatchCommitting(batchId) {
    if (!this.committingBatchIds) return false;
    return (
      this.committingBatchIds.has(batchId) ||
      this.committingBatchIds.has(Number(batchId)) ||
      this.committingBatchIds.has(String(batchId))
    );
  }

  isBatchCommitted(batchId) {
    if (!this.committedBatchIds) return false;
    return (
      this.committedBatchIds.has(batchId) ||
      this.committedBatchIds.has(Number(batchId)) ||
      this.committedBatchIds.has(String(batchId))
    );
  }
    /* ---------- real backend job ---------- */

  async loadExistingJob(
    projectId,
    jobId,
    token = null,
    repositoryName = null
  ) {
    this.stopRealJob();

    this.realJob = true;
    this.projectId = projectId;
    this.jobId = jobId;
    if (repositoryName) {
      this.repositoryName = repositoryName;
    }
    this.jobError = null;
    this.jobStatus = "loading";
    this.batches = [];
    this.totalBatches = 0;
    this.committingBatchIds = new Set();
    this.committedBatchIds = new Set();
    this.recordedCommits = [];
    this.serverCommits = null;
    this.commits = [];
    this.commitCount = 0;
    this._lastSseAt = 0;
    this._lastJobMessage = null;
    this.events = [];
    this.steps = Object.fromEntries(
      STEP_DEFS.map((d) => [
        d.key,
        {
          state: "pending",
          detail: d.idle,
          pct: 0,
          t0: null,
          t1: null,
          lines: [],
        },
      ]),
    );

    this.generating = false;
    this.finished = false;
    this.aside = "Loading documentation job...";
    this.emit();

    try {
      const job = await fetchJob(jobId, token);
      this.jobStatus = job.status;
      this.aside = job.message;

      const results = await fetchJobBatches(jobId, token);
      this.batches = normalizeBatches(results);
      this.batches.forEach((b) => {
        if (b.status === "done" || b.status === "committed") {
          this.committedBatchIds.add(b.id);
          this.committedBatchIds.add(Number(b.id));
        }
      });
      this.totalBatches =
        results.length > 0
          ? Math.max(
              ...results.map((r) => r.total_batches || 0),
              results.length
            )
          : this.batches.length;

      await this.syncCommitsFromServer();
      this.syncCommitsFromBatches();

      if (this.events.length === 0 && this.batches.length > 0) {
        const total = this.totalBatches || this.batches.length;
        this.events = [
          {
            id: `${this.jobId}-job-start`,
            time: "00:00:00",
            kind: "job",
            msg: "Documentation job started",
          },
          {
            id: `${this.jobId}-server`,
            time: "00:00:01",
            kind: "server",
            msg: "Repository uploaded and analyzed",
          },
          {
            id: `${this.jobId}-scan`,
            time: "00:00:02",
            kind: "scan",
            msg: "Repository files scanned",
          },
          {
            id: `${this.jobId}-ast`,
            time: "00:00:03",
            kind: "ast",
            msg: "AST parsing finished",
          },
          {
            id: `${this.jobId}-batching`,
            time: "00:00:04",
            kind: "batching",
            msg: `${total} documentation batches planned`,
          },
          ...this.batches.map((b) => ({
            id: `${this.jobId}-batch-${b.id}`,
            time: "00:00:05",
            kind: "batch",
            msg: `Batch ${b.id}/${total} completed (${b.files?.length || 0} files)`,
          })),
          {
            id: `${this.jobId}-job-completed`,
            time: "00:00:06",
            kind: "job",
            msg: "Core AI documentation job completed",
          },
        ];
      }

      this.subscribeRealJob();

      if (this.jobStatus === "completed") {
        this.finished = true;
        this.generating = false;
        this.markAllStepsDone();
        this.aside = "Finished";
      } else if (
        this.jobStatus === "running" ||
        this.jobStatus === "queued"
      ) {
        this.generating = true;
        this.finished = false;
        this.startPollingRealJob(token);
      }

      this.syncRealProgress();
      this.emit();
    } catch (error) {
      this.jobStatus = "failed";
      this.jobError =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to load documentation job";
      this.aside = this.jobError;
      this.emit();
    }
  }

  async startProjectJob(
    projectId,
    repositoryName = "repository",
    token = null
  ) {
    this.stopRealJob();

    this.realJob = true;
    this.projectId = projectId;
    this.repositoryName = repositoryName;
    this.jobError = null;
    this.jobStatus = "starting";
    this.batches = [];
    this.totalBatches = 0;
    this.committingBatchIds = new Set();
    this.committedBatchIds = new Set();
    this.recordedCommits = [];
    this.serverCommits = null;
    this.commits = [];
    this.commitCount = 0;
    this._lastSseAt = 0;
    this._lastJobMessage = null;
    this.events = [];

    this.steps = Object.fromEntries(
      STEP_DEFS.map((d) => [
        d.key,
        {
          state: "pending",
          detail: d.idle,
          pct: 0,
          t0: null,
          t1: null,
          lines: [],
        },
      ]),
    );

    this.generating = false;
    this.finished = false;
    this.aside = "Starting documentation job";
    this.emit();

    try {
      const job = await startProjectJob(
        projectId,
        repositoryName,
        token
      );

      this.jobId = job.job_id;
      this.jobStatus = job.status;
      this.aside = job.message;

      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`docpilot_job_${projectId}`, job.job_id);
        localStorage.setItem("docpilot_last_project", projectId);
        localStorage.setItem("docpilot_last_job", job.job_id);
      }

      this.subscribeRealJob();
      this.startPollingRealJob(token);
      this.emit();

      await this.refreshRealJob(token);
    } catch (error) {
      this.jobStatus = "failed";
      this.jobError =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to start documentation job";

      this.aside = this.jobError;
      this.emit();
    }
  }

  startPollingRealJob(token = null) {
    this.stopPollingRealJob();
    this.pollInterval = setInterval(async () => {
      if (
        !this.jobId ||
        this.jobStatus === "completed" ||
        this.jobStatus === "failed"
      ) {
        this.stopPollingRealJob();
        return;
      }
      try {
        await this.refreshRealJob(token);
      } catch {}
    }, 2500);
  }

  stopPollingRealJob() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  subscribeRealJob() {
    if (!this.jobId) return;

    this.stopRealJobStream();

    console.log(`[DocPilotEvents] Connecting: ${this.jobId}`);

    this.jobEventSource = subscribeToJob(this.jobId, {
      onOpen: () => {
        console.log(`[DocPilotEvents] Connected: ${this.jobId}`);
        this.aside = "Connected to job event stream";
        this.emit();
      },

      onEvent: ({ eventType, payload }) => {
        this.handleRealEvent(eventType, payload);
      },

      onError: () => {
        if (
          this.jobStatus === "completed" ||
          this.jobStatus === "failed"
        ) {
          return;
        }

        console.log(`[DocPilotEvents] Disconnected: ${this.jobId}`);
        this.aside = "Job event stream reconnecting...";
        this.emit();

        // EventSource retries by itself only while readyState is CONNECTING.
        // After a non-200 / proxy cut it is CLOSED and stays silent forever.
        if (this.jobEventSource && this.jobEventSource.readyState === 2 && !this._sseRetry) {
          this._sseRetry = setTimeout(() => {
            this._sseRetry = 0;
            if (this.realJob && this.jobId && this.jobStatus !== "completed" && this.jobStatus !== "failed") {
              this.subscribeRealJob();
              this.scheduleBatchRefresh(0);
            }
          }, 2000);
        }
      },
    });
  }

  async refreshRealJob(token = null) {
    if (!this.jobId) return;

    try {
      const job = await fetchJob(this.jobId, token);

      this.jobStatus = job.status;
      if (job.message) {
        this.aside = job.message;
        // Fallback so the feed still moves if the SSE stream is buffered or down.
        if (job.message !== this._lastJobMessage) {
          this._lastJobMessage = job.message;
          this.pushPollEvent(job.stage || "job", job.message);
        }
      }

      if (job.status === "completed") {
        this.finished = true;
        this.generating = false;
        this.markAllStepsDone();
        this.stopPollingRealJob();
        this.stopRealJobStream();
      } else if (job.status === "failed") {
        this.finished = false;
        this.generating = false;
        this.jobError = job.message;
        this.stopPollingRealJob();
        this.stopRealJobStream();
      }

      await this.refreshRealBatches(token);
      this.emit();
    } catch (error) {
      this.jobError =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to refresh documentation job";
      this.emit();
    }
  }

  handleRealEvent(eventType, payload) {
    const event = payload || {};
    const stage = event.stage || eventType;
    const message = event.message || stage;
    const progress = event.progress;

    // Filter events by jobId to prevent any cross-run leakage
    if (
      event.job_id &&
      this.jobId &&
      String(event.job_id).toLowerCase().trim() !== String(this.jobId).toLowerCase().trim()
    ) {
      return;
    }

    console.log(`[DocPilotEvents] Event: [${stage}] ${message}`);
    this._lastSseAt = Date.now();
    const beforeLen = this.events.length;
    // the real event replaces any poll-generated stand-in with the same text
    if (this.events.some((e) => e.source === "poll" && e.msg === message)) {
      this.events = this.events.filter((e) => !(e.source === "poll" && e.msg === message));
    }

    const evId =
      event.event_id ||
      `${event.job_id || this.jobId || 'job'}-${event.timestamp || ''}-${stage}-${message}-${event.type || ''}`;

    const time = event.timestamp
      ? new Date(event.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      : new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });

    if (!this.events.some((e) => e.id === evId || (e.msg === message && e.kind === stage && e.time === time))) {
      this.events.push({
        id: evId,
        time,
        kind: stage,
        msg: message,
      });

      if (this.events.length > 200) {
        this.events.shift();
      }
    }


    if (stage === "upload") {
      if (this.steps.upload) {
        this.steps.upload.state =
          event.type === "completed" ? "done" : "active";
        this.steps.upload.detail = message;
      }
    } else if (stage === "server") {
      if (this.steps.upload) this.steps.upload.state = "done";
      if (this.steps.server) {
        this.steps.server.state =
          event.type === "completed" ? "done" : "active";
        this.steps.server.detail = message;
      }
    } else if (stage === "ast") {
      if (this.steps.upload) this.steps.upload.state = "done";
      if (this.steps.server) {
        this.steps.server.state =
          event.type === "completed" ? "done" : "active";
        this.steps.server.detail = message;
      }
    } else if (stage === "scan") {
      if (this.steps.upload) this.steps.upload.state = "done";
      if (this.steps.server) this.steps.server.state = "done";
      if (this.steps.scan) {
        this.steps.scan.state =
          event.type === "completed" ? "done" : "active";
        this.steps.scan.detail = message;
        if (progress?.total) {
          this.steps.scan.pct = Math.min(
            1,
            (progress.current || 0) / progress.total
          );
        }
      }
    } else if (stage === "security" || stage === "secret") {
      if (this.steps.scan) this.steps.scan.state = "done";
      if (this.steps.secrets) {
        this.steps.secrets.state =
          event.type === "completed" ? "done" : "active";
        this.steps.secrets.detail = message;
      }
    } else if (stage === "redaction" || stage === "secure") {
      if (this.steps.secrets) this.steps.secrets.state = "done";
      if (this.steps.secure) {
        this.steps.secure.state =
          event.type === "completed" ? "done" : "active";
        this.steps.secure.detail = message;
      }
    } else if (stage === "batching") {
      if (this.steps.secure) this.steps.secure.state = "done";
      if (this.steps.batch) {
        this.steps.batch.state =
          event.type === "completed" ? "done" : "active";
        this.steps.batch.detail = message;
        if (progress?.total) {
          this.totalBatches = progress.total;
          this.steps.batch.pct = Math.min(
            1,
            (progress.current || 0) / progress.total
          );
        }
      }
    } else if (stage === "generation" || stage === "gen") {
      if (this.steps.batch) this.steps.batch.state = "done";
      if (this.steps.gen) {
        this.steps.gen.state =
          event.type === "completed" ? "done" : "active";
        this.steps.gen.detail = message;
        if (progress?.total) {
          this.totalBatches = progress.total;
          this.steps.gen.pct = Math.min(
            1,
            (progress.current || 0) / progress.total
          );
        }
      }
    } else if (stage === "batch") {
      if (this.steps.batch) this.steps.batch.state = "done";
      this.scheduleBatchRefresh();
    } else if (stage === "commit") {
      // a commit happened on the server: re-read batches + commit history
      this.scheduleBatchRefresh();
      this.syncCommitsFromServer().then(() => this.emit());
    } else if (stage === "job") {
      if (event.type === "started") {
        this.jobStatus = "running";
        this.generating = true;
      } else if (
        event.type === "completed" ||
        eventType === "done"
      ) {
        this.jobStatus = "completed";
        this.finished = true;
        this.generating = false;
        this.aside = "Documentation Complete ✓";
        this.markAllStepsDone();
        this.stopPollingRealJob();
        this.scheduleBatchRefresh(0);
        this.toast({
          kind: "ok",
          title: "Documentation completed",
          text: "Your repository has been successfully documented.",
        });
      } else if (event.type === "failed") {
        this.jobStatus = "failed";
        this.finished = false;
        this.generating = false;
        this.jobError = message;
        this.aside = message;
        this.stopPollingRealJob();
        this.stopRealJobStream();
      }
    }

    if (progress) {
      const current = progress.current ?? 0;
      const total = progress.total ?? this.totalBatches;
      if (total > 0) {
        this.totalBatches = total;
      }
      this.syncRealProgress(current);
    }

    this.emit();
  }

  async downloadZip() {
    if (!this.jobId) return;
    try {
      this.toast({
        kind: "info",
        title: "Preparing download",
        text: "Packaging documented repository...",
      });
      await downloadJobArchive(
        this.jobId,
        getToken(),
        this.repositoryName || "repository"
      );
      this.toast({
        kind: "ok",
        title: "Download started",
        text: "Your documented repository ZIP has been generated.",
      });
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to download repository archive";
      this.toast({
        kind: "warn",
        title: "Download failed",
        text: msg,
      });
    }
  }

  findBatch(id) {
    return this.batches.find((x) => x.id === id || Number(x.id) === Number(id)) || null;
  }

  markBatchCommitted(id) {
    this.committedBatchIds ??= new Set();
    this.committedBatchIds.add(id);
    this.committedBatchIds.add(Number(id));
  }

  setCommitting(id, on) {
    this.committingBatchIds ??= new Set();
    for (const k of [id, Number(id)]) {
      if (on) this.committingBatchIds.add(k);
      else this.committingBatchIds.delete(k);
    }
  }

  /** Coalesce bursts of "batch" events into a single refresh. */
  scheduleBatchRefresh(delay = 300) {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = 0;
      this.refreshRealBatches(getToken());
    }, delay);
  }

  /** Feed entry created by polling (used only while the SSE stream is silent). */
  pushPollEvent(kind, msg) {
    if (Date.now() - this._lastSseAt < 6000) return; // SSE is delivering, don't duplicate
    this.events.push({
      id: `${this.jobId}-poll-${kind}-${msg}`,
      time: clockNow(),
      kind,
      msg,
      source: "poll",
    });
    const seen = new Set();
    this.events = this.events.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
    if (this.events.length > 200) this.events.shift();
  }

  /**
   * Combine a batch from the server with what this browser already knows.
   * Rules:
   *  - being committed right now  -> keep local, a poll must not touch it
   *  - committed on the server    -> server copy wins
   *  - committed locally          -> keep local (server may lag a moment)
   *  - otherwise                  -> server copy, but keep the user's review
   *                                  progress (approved / skipped hunks)
   */
  mergeServerBatch(serverBatch) {
    const local = this.findBatch(serverBatch.id);

    if (local && this.isBatchCommitting(serverBatch.id)) return local;

    if (serverBatch.status === "done") {
      this.markBatchCommitted(serverBatch.id);
      return {
        ...serverBatch,
        page: local?.page ?? 0,
        fresh: false,
      };
    }

    const locallyFinal =
      this.isBatchCommitted(serverBatch.id) ||
      local?.status === "done" ||
      local?.status === "committed";
    if (local && locallyFinal) return { ...local, status: "done", fresh: false };

    if (!local) return serverBatch;

    // carry review progress over to the fresh server copy
    for (const sf of serverBatch.files || []) {
      const lf = (local.files || []).find((f) => f.name === sf.name);
      if (!lf) continue;
      sf.hunks.forEach((sh, i) => {
        const lh = lf.hunks.find((h) => h.target && h.target === sh.target) || lf.hunks[i];
        if (lh && (lh.status === "committed" || lh.status === "skipped")) {
          sh.status = lh.status;
          sh.sha = lh.sha;
        }
      });
    }

    return {
      ...serverBatch,
      page: local.page ?? 0,
      fresh: local.fresh ?? serverBatch.fresh,
      apSeen: local.apSeen,
    };
  }

  async refreshRealBatches(token = null) {
    if (!this.jobId) return;
    token = token || getToken();

    const jobId = this.jobId;
    const seq = ++this._refreshSeq;

    try {
      const results = await fetchJobBatches(jobId, token);

      // A newer refresh started, or the job changed: this answer is stale.
      if (seq !== this._refreshSeq || jobId !== this.jobId) return;

      const normalized = normalizeBatches(results);
      const known = new Set(this.batches.map((b) => Number(b.id)));
      const total = Math.max(
        this.totalBatches,
        ...results.map((r) => r.total_batches || 0),
        results.length
      );

      // Fallback feed entries for batches we first hear about via polling.
      for (const sb of normalized) {
        if (!known.has(Number(sb.id))) {
          this.pushPollEvent(
            "batch",
            `Batch ${sb.id}/${total || "?"} completed (${sb.files?.length || 0} files)`
          );
        }
      }

      this.batches = normalized.map((sb) => this.mergeServerBatch(sb));

      if (results.length > 0) this.totalBatches = total;

      this.syncCommitsFromBatches();
      this.syncRealProgress();
      this.emit();

      if (this.autoCommit) this.autoCommitArrivals();
    } catch (error) {
      if (seq !== this._refreshSeq) return;
      this.jobError = error?.message || "Failed to load batch results";
      this.emit();
    }
  }

  /* ---------- commits (backend-backed) ---------- */

  /** Pull the real commit history if the API offers it. */
  async syncCommitsFromServer() {
    if (!this.realJob || !this.jobId) return;
    const list = await fetchJobCommits(this.jobId, getToken());
    if (!Array.isArray(list)) return;
    this.serverCommits = list.map(normalizeCommit);
    this.syncCommitsFromBatches();
  }

  /** Remember a commit the backend just confirmed. */
  recordCommit(c) {
    this.recordedCommits = [c, ...this.recordedCommits.filter((x) => x.id !== c.id)];
    this.syncCommitsFromBatches();
  }

  /** Commit buttons / last approved hunk -> one backend call per batch. */
  async persistBatch(b, { auto = false, msg = null } = {}) {
    if (!b || !this.realJob || !this.jobId) return false;
    const id = b.id;

    if (b.status === "done" || b.status === "committed" || this.isBatchCommitted(id)) return true;
    if (this.isBatchCommitting(id)) return false;

    const hunks = (b.files || []).flatMap((f) => f.hunks || []);
    const approved = hunks.filter((h) => h.status === "committed").length;
    const pending = hunks.filter((h) => h.status === "pending").length;

    // everything was skipped: nothing to write, just close the review
    if (hunks.length > 0 && approved + pending === 0) {
      b.status = "done";
      b.fresh = false;
      this.afterPersist(b, "reviewed, every change skipped (nothing committed)");
      return true;
    }

    const commitMsg =
      msg ||
      (hunks.length
        ? `docs: batch ${id}, ${b.files?.length || 0} file${(b.files?.length || 0) === 1 ? "" : "s"}`
        : b.readme
        ? `docs: batch ${id}, README documentation`
        : `docs: batch ${id}`);

    this.setCommitting(id, true);
    this.emit();

    let result;
    try {
      result = await commitJobBatch(this.jobId, id, getToken());
    } catch (error) {
      console.error(`Failed to commit batch ${id} on backend:`, error);
      // un-stage hunks so the user can try again
      const cur = this.findBatch(id) || b;
      for (const f of cur.files || [])
        for (const h of f.hunks || []) if (h.status === "committed" && !h.sha) h.status = "pending";
      const text =
        error?.response?.data?.detail || error?.message || `Failed to commit batch ${id}.`;
      this.pushEvent("commit", `Batch ${id} commit failed: ${text}`);
      if (!auto) this.toast({ kind: "warn", title: "Commit failed", text });
      return false;
    } finally {
      this.setCommitting(id, false);
      this.emit();
    }

    const info = extractCommitInfo(result);
    const sha = info.sha || stableSha(`${this.jobId}:${id}`);
    const cur = this.findBatch(id) || b;

    for (const f of cur.files || []) {
      for (const h of f.hunks || []) {
        if (h.status === "pending") h.status = "committed";
        if (h.status === "committed") h.sha = sha;
      }
    }
    cur.status = "done";
    cur.fresh = false;
    this.markBatchCommitted(id);

    this.recordCommit({
      id: `commit-batch-${id}`,
      sha,
      msg: info.message || commitMsg + (auto ? " (auto-commit)" : ""),
      n: info.count ?? (approved + pending || (cur.readme ? 1 : 1)),
      batchIds: [Number(id)],
      at: info.at || Date.now(),
      source: "backend",
    });

    this.afterPersist(cur);

    // confirm with the server, which is the source of truth
    this.syncCommitsFromServer().then(() => this.emit());
    this.scheduleBatchRefresh(400);
    return true;
  }

  afterPersist(b, label = "committed") {
    this.flash = null;
    this.modal.animate = false;
    this.pushEvent("commit", `Batch ${b.id} ${label}`);
    this.batches = [...this.batches];
    this.checkAllDone();
    this.emit();
  }

  checkAllDone() {
    const allDone =
      this.batches.length > 0 &&
      (!this.totalBatches || this.batches.length >= this.totalBatches) &&
      this.batches.every(
        (x) => x.status === "done" || x.status === "committed" || this.isBatchCommitted(x.id)
      );
    if (allDone && this.jobStatus === "completed") this.finish();
  }

  /** After "commit entire repository": commit batches that arrive later. */
  async autoCommitArrivals() {
    if (this._autoCommitRunning || !this.realJob) return;
    this._autoCommitRunning = true;
    try {
      for (const b of this.batches.slice()) {
        if (!this.autoCommit) break;
        if (b.status === "done" || b.status === "committed") continue;
        if (this.isBatchCommitted(b.id) || this.isBatchCommitting(b.id)) continue;
        if (!(b.files?.length || b.readme)) continue;
        await this.persistBatch(b, { auto: true });
      }
    } finally {
      this._autoCommitRunning = false;
    }
  }

  pushEvent(kind, msg) {
    this.events.push({
      id: `${this.jobId || "job"}-local-${Date.now()}-${kind}-${msg}`,
      time: clockNow(),
      kind,
      msg,
    });
    if (this.events.length > 200) this.events.shift();
    this.emit();
  }

  markAllStepsDone() {
    for (const def of STEP_DEFS) {
      if (this.steps[def.key]) {
        this.steps[def.key].state = "done";
        this.steps[def.key].pct = 1;
      }
    }
    if (this.steps.upload)
      this.steps.upload.detail = "Project files verified";
    if (this.steps.server)
      this.steps.server.detail = "Connected and analyzed";
    if (this.steps.scan)
      this.steps.scan.detail = "Files scanned";
    if (this.steps.secrets)
      this.steps.secrets.detail = "Security check passed";
    if (this.steps.secure)
      this.steps.secure.detail = "Security rules applied";
    if (this.steps.batch)
      this.steps.batch.detail = `${this.totalBatches || this.batches.length} batches created`;
    if (this.steps.gen)
      this.steps.gen.detail = `${this.batches.length} of ${this.totalBatches || this.batches.length} batches generated`;
  }

  syncRealProgress(current = null) {
    const completed = this.batches.length;
    const total = this.totalBatches || completed;

    if (this.steps?.gen) {
      this.steps.gen.state =
        this.jobStatus === "completed" ? "done" : "active";

      this.steps.gen.pct =
        total > 0
          ? Math.min(1, (current ?? completed) / total)
          : 0;

      this.steps.gen.detail =
        total > 0
          ? `${completed} of ${total} batches generated`
          : "Waiting for batches";
    }

    this.aside =
      this.jobStatus === "completed"
        ? "Finished"
        : `${completed} of ${total || "?"} batches generated`;
  }

  stopRealJobStream() {
    if (this._sseRetry) {
      clearTimeout(this._sseRetry);
      this._sseRetry = 0;
    }
    if (this.jobEventSource) {
      this.jobEventSource.close();
      this.jobEventSource = null;
    }
  }

  stopRealJob() {
    this.stopRealJobStream();
    this.stopPollingRealJob();

    this.realJob = false;
    this.jobId = null;
    this.projectId = null;
    this.jobStatus = null;
    this.totalBatches = 0;
    this.repositoryName = null;
    this.jobError = null;
  }

  /* ---------- lifecycle ---------- */
  start({ simulate = true } = {}) {
  if (this.loopId) return;

  this.last = performance.now();

  // setInterval (not rAF) so the UI keeps updating in background tabs.
  this.loopId = setInterval(
    () => this.frame(performance.now()),
    33
  );

  this._onVisible = () => {
    if (document.visibilityState === "visible") {
      this.last = performance.now();
      this.emit();
    }
  };

  document.addEventListener(
    "visibilitychange",
    this._onVisible
  );

  if (simulate) {
    this.restart();
  } else {
    this.runId++;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.waiters = [];
    this.tweens = [];

    this.init();
    this.emit();
  }
}

  stop() {
    clearInterval(this.loopId);
    this.loopId = 0;
    clearTimeout(this._emitTimer);
    this._emitTimer = 0;
    if (this._onVisible) {
      document.removeEventListener('visibilitychange', this._onVisible);
      this._onVisible = null;
    }
    this.stopRealJobStream();
    this.stopPollingRealJob();
    if (this._refreshTimer) { clearTimeout(this._refreshTimer); this._refreshTimer = 0; }
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
      if (this.generating && !this.finished && !this.realJob) this.genTick(sdt);
    }
    if (this._dirty && ts - this._lastEmit >= 90) this.emit();
  }

  /* ---------- derived data ---------- */
  counts() {
    let queued = 0;
    let generating = 0;
    let ready = 0;
    let done = 0;

    for (const b of this.batches) {
      const s = batchState(b);
      const isCommitted =
        this.isBatchCommitted(b.id) ||
        s === "done" ||
        s === "committed" ||
        b.status === "done" ||
        b.status === "committed" ||
        (b.files && b.files.length > 0 && pendingCount(b) === 0);

      if (isCommitted) {
        done++;
      } else if (s === "queued") {
        queued++;
      } else if (s === "generating") {
        generating++;
      } else if (s === "ready" || s === "partial") {
        ready++;
      }
    }

    return {
      queued,
      generating,
      ready,
      done,
    };
  }

  tally() {
    let total = 0, committed = 0, skipped = 0, staged = 0;
    for (const b of this.batches) {
      const isBatchCommitted =
        this.isBatchCommitted?.(b.id) ||
        b.status === "done" ||
        b.status === "committed";

      let batchHasHunks = false;

      for (const f of (b.files || [])) {
        for (const h of (f.hunks || [])) {
          batchHasHunks = true;
          total++;
          if (h.status === "committed" || isBatchCommitted) {
            // real jobs: approved but not yet written by the backend = staged
            if (this.realJob && !isBatchCommitted && !h.sha) staged++;
            else committed++;
          } else if (h.status === "skipped") skipped++;
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
    const s = this.steps[key];
    if (s.t0 == null) return null;
    return (s.t1 ?? this.simTime) - s.t0;
  }

  syncGen() {
    if (this.realJob) return; // real jobs report their own progress
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

  /**
   * Rebuild this.commits (what CommitPanel shows).
   * Priority: commit history from the server > commits the backend confirmed
   * to us > a derived entry for batches that are committed but have no record
   * (e.g. after a page reload when no history endpoint exists).
   */
  syncCommitsFromBatches() {
    if (!this.realJob) return; // the simulation keeps its own list via addCommit()
    this.committedBatchIds ??= new Set();

    const merged = [];
    const seen = new Set();
    const covered = new Set();
    const add = (c) => {
      const key = c.sha || c.id;
      if (seen.has(key)) return;
      seen.add(key);
      (c.batchIds || []).forEach((id) => covered.add(Number(id)));
      merged.push(c);
    };

    (this.serverCommits || []).forEach(add);
    (this.recordedCommits || []).forEach(add);

    for (const b of this.batches || []) {
      const isCommitted =
        this.isBatchCommitted(b.id) || b.status === "done" || b.status === "committed";
      if (!isCommitted) continue;

      this.markBatchCommitted(b.id);
      if (covered.has(Number(b.id))) continue;

      const n = changesIn(b) || (b.readme ? 1 : 0) || 1;
      add({
        id: `commit-batch-${b.id}`,
        sha: b.commitSha || stableSha(`${this.jobId || "local"}:${b.id}`),
        msg:
          b.files && b.files.length > 0
            ? `docs: batch ${b.id}, ${b.files.length} file${b.files.length > 1 ? "s" : ""}`
            : b.readme
            ? `docs: batch ${b.id}, README documentation`
            : `docs: batch ${b.id}`,
        n,
        batchIds: [Number(b.id)],
        at: b.committedAt || null,
        source: "derived",
      });
    }

    // newest first; entries without a timestamp sink to the bottom by batch id
    merged.sort((a, b) => (b.at || 0) - (a.at || 0) || (b.batchIds?.[0] || 0) - (a.batchIds?.[0] || 0));

    this.commits = merged.slice(0, 100);
    this.commitCount = merged.length;
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
      const list = (b.files || []).flatMap((f) => pendingHunks(f));
      const commitMsg = list.length
        ? `docs: batch ${b.id}, ${b.files?.length || 0} files (auto-commit)`
        : b.readme
        ? `docs: batch ${b.id}, README documentation (auto-commit)`
        : `docs: batch ${b.id} (auto-commit)`;
      const sha = this.addCommit(commitMsg, list.length || 1);
      if (list.length) {
        list.forEach((h) => { h.status = 'committed'; h.sha = sha; });
      }
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
  async openModal(i) {
    this.modal = { open: true, batch: i, animate: true, tab: 'changes' };
    this.confirmRepo = false;
    this.toasts = this.toasts.filter((t) => t.kind !== 'ready');
    this.emit();

    if (this.realJob && this.jobId && this.batches[i]) {
      const b = this.batches[i];
      try {
        const token = getToken();
        const batchDetail = await fetchBatch(this.jobId, b.id, token);
        if (batchDetail) {
          const targetIdx = this.batches.findIndex(
            (x) => x.id === b.id || Number(x.id) === Number(b.id)
          );
          if (targetIdx >= 0) {
            // mergeServerBatch keeps approved/skipped hunks and in-flight commits
            this.batches[targetIdx] = this.mergeServerBatch(normalizeBatch(batchDetail));
            this.batches = [...this.batches];
            this.emit();
          }
        }
      } catch (err) {
        console.error("Failed to fetch batch detail:", err);
      }
    }

  }

  closeModal() {
    this.modal.open = false;
    this.emit();
  }

  async switchBatch(i) {
    this.modal.batch = i;
    this.modal.animate = true;
    this.confirmRepo = false;
    this.flash = null;
    this.emit();

    if (this.realJob && this.jobId && this.batches[i]) {
      const b = this.batches[i];
      try {
        const token = getToken();
        const batchDetail = await fetchBatch(this.jobId, b.id, token);
        if (batchDetail) {
          const targetIdx = this.batches.findIndex(
            (x) => x.id === b.id || Number(x.id) === Number(b.id)
          );
          if (targetIdx >= 0) {
            // mergeServerBatch keeps approved/skipped hunks and in-flight commits
            this.batches[targetIdx] = this.mergeServerBatch(normalizeBatch(batchDetail));
            this.batches = [...this.batches];
            this.emit();
          }
        }
      } catch (err) {
        console.error("Failed to fetch batch detail:", err);
      }
    }
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
    // Real jobs: approving a change stages it; the backend commits per batch.
    h.sha = this.realJob ? null : this.addCommit(`docs(${shortPath(f.name)}): ${h.title}`, 1);
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
    const sha = this.realJob ? null : this.addCommit(`docs: ${f.name}, ${list.length} change${list.length > 1 ? 's' : ''}`, list.length);
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

  async commitBatch(b) {
    if (typeof b === "number" || (typeof b === "string" && !isNaN(b))) {
      const num = Number(b);
      b = this.findBatch(num) || this.batches[num];
    }
    if (!b) return false;
    if (b.status === "done" || b.status === "committed") return true;

    // Real job: the backend is the source of truth.
    if (this.realJob && this.jobId) return this.persistBatch(b);

    // ---- simulation (unchanged behaviour) ----
    const list = (b.files || []).flatMap((f) => pendingHunks(f));
    const commitMsg = list.length
      ? `docs: batch ${b.id}, ${b.files?.length || 0} files`
      : b.readme
      ? `docs: batch ${b.id}, README documentation`
      : `docs: batch ${b.id}`;
    const sha = this.addCommit(commitMsg, list.length || 1);
    list.forEach((h) => { h.status = "committed"; h.sha = sha; });
    b.status = "done";
    b.fresh = false;
    this.flash = null;
    this.modal.animate = false;
    this.batches = [...this.batches];
    let c = 0, sk = 0;
    (b.files || []).forEach((f) => (f.hunks || []).forEach((h) => {
      if (h.status === "committed") c++; else if (h.status === "skipped") sk++;
    }));
    this.log("commit", `Batch ${b.id} finished: ${c} committed${sk ? `, ${sk} skipped` : ""}`);
    if (this.batches.every((x) => x.status === "done" || x.status === "committed")) this.finish();
    this.emit();
    return true;
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
    if (this.realJob && this.jobId) return this.commitRepoReal();

    const ready = this.batches.filter(
      (b) => b.status !== 'done' && b.status !== 'committed' && (b.status === 'ready' || b.status === 'partial' || pendingCount(b) > 0 || b.readme)
    );
    const list = ready.flatMap((b) => (b.files || []).flatMap((f) => pendingHunks(f)));
    this.autoCommit = true;
    this.confirmRepo = false;
    if (list.length) {
      const sha = this.addCommit(`docs: AI documentation for ${REPO.name}, ${ready.length} batches so far`, list.length);
      list.forEach((h) => { h.status = 'committed'; h.sha = sha; });
    } else if (ready.length) {
      this.addCommit(`docs: AI documentation for ${REPO.name}, ${ready.length} batches so far`, ready.length);
    }
    ready.forEach((b) => this.checkBatchDone(b));
    this.modal.open = false;
    this.toast({
      kind: 'ok',
      title: 'Committing the whole repository',
      text: `${list.length || ready.length} changes saved. Every batch that arrives from now on is committed automatically.`,
    });
  }

  /** Real job: one backend call, then mirror the result. */
  async commitRepoReal() {
    const ready = this.batches.filter(
      (b) =>
        b.status !== 'done' && b.status !== 'committed' &&
        !this.isBatchCommitted(b.id) && !this.isBatchCommitting(b.id) &&
        (b.files?.length || b.readme)
    );
    this.confirmRepo = false;
    this.modal.open = false;
    if (!ready.length) {
      this.autoCommit = true;
      this.emit();
      return;
    }

    ready.forEach((b) => this.setCommitting(b.id, true));
    this.emit();

    let result;
    try {
      result = await commitAllJobBatches(this.jobId, getToken());
    } catch (error) {
      ready.forEach((b) => this.setCommitting(b.id, false));
      this.toast({
        kind: 'warn',
        title: 'Commit failed',
        text: error?.response?.data?.detail || error?.message || 'Could not commit the repository.',
      });
      this.emit();
      return;
    }
    ready.forEach((b) => this.setCommitting(b.id, false));

    const info = extractCommitInfo(result);
    const sha = info.sha || stableSha(`${this.jobId}:all:${ready.map((b) => b.id).join(',')}`);
    let n = 0;
    for (const b of ready) {
      const cur = this.findBatch(b.id) || b;
      const hs = (cur.files || []).flatMap((f) => f.hunks || []);
      n += hs.filter((h) => h.status !== 'skipped').length || (cur.readme ? 1 : 1);
      for (const h of hs) {
        if (h.status === 'pending') h.status = 'committed';
        if (h.status === 'committed') h.sha = sha;
      }
      cur.status = 'done';
      cur.fresh = false;
      this.markBatchCommitted(cur.id);
    }

    this.autoCommit = true; // later batches are committed as they arrive
    this.recordCommit({
      id: `commit-repo-${sha}`,
      sha,
      msg: info.message || `docs: AI documentation for ${this.repositoryName || 'repository'}, ${ready.length} batch${ready.length > 1 ? 'es' : ''}`,
      n: info.count ?? n,
      batchIds: ready.map((b) => Number(b.id)),
      at: info.at || Date.now(),
      source: 'backend',
    });
    this.pushEvent('commit', `Repository commit ${sha}: ${ready.length} batch${ready.length > 1 ? 'es' : ''} committed`);
    this.batches = [...this.batches];
    this.toast({
      kind: 'ok',
      title: 'Repository committed',
      text: `${ready.length} batch${ready.length > 1 ? 'es' : ''} committed. Batches that arrive from now on are committed automatically.`,
    });
    this.checkAllDone();
    this.emit();

    this.syncCommitsFromServer().then(() => this.emit());
    this.scheduleBatchRefresh(400);
  }

  setAutoCommit(on) {
    this.autoCommit = on;
    if (!on) this.toast({ kind: 'info', title: 'Auto-commit is off', text: 'New batches will wait for your review again.' });
    this.emit();
  }

  checkBatchDone(b) {
    if (b.status === 'done' || b.status === 'committed') return;
    if (pendingCount(b) > 0) return;

    // Real job: the last change was handled -> write the batch to the backend.
    // Status only flips to "done" once the backend confirms.
    if (this.realJob && this.jobId) {
      this.persistBatch(b);
      return;
    }

    b.status = 'done';
    const idx = this.batches.findIndex((x) => x.id === b.id);
    if (idx >= 0) this.batches = [...this.batches];
    let c = 0, s = 0;
    (b.files || []).forEach((f) => (f.hunks || []).forEach((h) => { if (h.status === 'committed') c++; else if (h.status === 'skipped') s++; }));
    this.log('commit', `Batch ${b.id} finished: ${c} committed${s ? `, ${s} skipped` : ''}`);
    const allDone =
      this.batches.length > 0 &&
      (!this.totalBatches || this.batches.length >= this.totalBatches) &&
      this.batches.every((x) => x.status === 'done' || x.status === 'committed');
    if (allDone) this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const t = this.tally();
    const total = this.totalBatches || this.batches.length || REPO.batches;
    if (this.realJob) {
      this.pushEvent('done', `All ${total} batches committed`);
      this.aside = 'Finished';
      this.toast({
        kind: 'ok',
        title: 'Repository complete',
        text: `${fmtN(t.committed)} changes committed.`,
      });
      this.modal.open = false;
      this.emit();
      return;
    }
    this.log('done', `All ${total} batches done. Pull request #482 opened from ${PR_BRANCH}`);
    this.setStep('gen', 'done', `${total} of ${total} batches committed`, 1);
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
        D.log('scan', `${fmtN(n)} files checked, last: ${D.batches[Math.min(D.batches.length - 1, Math.floor(p * 100))]?.files[0]?.name}`);
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
      const nx = this.batches.findIndex((b) => b.status !== 'done' && b.status !== 'committed' && (b.status === 'ready' || batchState(b) === 'partial') && pendingCount(b) > 0);
      if (nx >= 0) this.openModal(nx);
      return;
    }
    const b = this.batches[this.modal.batch];
    if (b.status === 'done' || b.status === 'committed') {
      this.apDone++;
      const nx = this.batches.findIndex((x) => x.status !== 'done' && x.status !== 'committed' && (x.status === 'ready' || batchState(x) === 'partial') && pendingCount(x) > 0);
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
