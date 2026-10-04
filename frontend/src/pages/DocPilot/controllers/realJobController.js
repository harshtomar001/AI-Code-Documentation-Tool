import { STEP_DEFS } from "../data/constants.js";
import { startProjectJob, fetchJob, fetchJobBatches, fetchBatch } from "../api/docPilotJobs.js";
import { normalizeBatch, normalizeBatches } from "../utils/batchAdapter.js";
import { clockNow } from "../utils/format.js";
import { jobStore, createInitialJobState } from "../store/jobStore.js";
import { JobStream } from "../services/jobStream.js";
import { JobPoller } from "../services/jobPoller.js";
import { mergeServerBatch } from "../services/batchMerge.js";
import { commitBatch, syncCommitsFromServer } from "../services/commitService.js";
import { getToken } from "../../../utils/getToken.js";

function markAllStepsDone(steps, totalBatches, batchesCount) {
  const nextSteps = { ...steps };
  for (const def of STEP_DEFS) {
    if (nextSteps[def.key]) {
      nextSteps[def.key] = {
        ...nextSteps[def.key],
        state: "done",
        pct: 1,
      };
    }
  }
  if (nextSteps.upload) nextSteps.upload.detail = "Project files verified";
  if (nextSteps.server) nextSteps.server.detail = "Connected and analyzed";
  if (nextSteps.scan) nextSteps.scan.detail = "Files scanned";
  if (nextSteps.secrets) nextSteps.secrets.detail = "Security check passed";
  if (nextSteps.secure) nextSteps.secure.detail = "Security rules applied";
  if (nextSteps.batch)
    nextSteps.batch.detail = `${totalBatches || batchesCount} batches created`;
  if (nextSteps.gen)
    nextSteps.gen.detail = `${batchesCount} of ${totalBatches || batchesCount} batches generated`;

  return nextSteps;
}

export class RealJobController {
  constructor() {
    this.stream = null;
    this.poller = new JobPoller();
    this._refreshSeq = 0;
    this._batchRefreshTimer = null;
    this._autoCommitRunning = false;
    this._lastJobMessage = null;
    this._lastSseAt = 0;
  }

  /**
   * Start a new real project documentation job.
   *
   * @param {string} projectId
   * @param {string} [repositoryName]
   * @param {string|null} [token]
   * @param {(newJobId: string) => void} [onUrlUpdate]
   * @returns {Promise<string|null>}
   */
  async startJob(projectId, repositoryName = "repository", token = null, onUrlUpdate = null) {
    this.stop();

    token = token || getToken();

    jobStore.reset({
      realJob: true,
      projectId,
      repositoryName,
      status: "starting",
      aside: "Starting documentation job",
    });

    try {
      const job = await startProjectJob(projectId, repositoryName, token);
      const jobId = job.job_id;

      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`docpilot_job_${projectId}`, jobId);
        localStorage.setItem("docpilot_last_project", projectId);
        localStorage.setItem("docpilot_last_job", jobId);
      }

      jobStore.setState({
        jobId,
        status: job.status,
        aside: job.message || "Connected to job",
      });

      if (typeof onUrlUpdate === "function") {
        onUrlUpdate(jobId);
      } else if (typeof window !== "undefined" && window.location) {
        const url = new URL(window.location.href);
        url.searchParams.set("jobId", jobId);
        window.history.replaceState({}, "", url.toString());
      }

      this._wireStreamAndPoller(jobId, token);
      this.refreshBatches(token);
      return jobId;
    } catch (err) {
      console.error("[RealJobController] Failed to start project job:", err);
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to start documentation job";
      jobStore.setState({
        status: "failed",
        jobError: msg,
        aside: msg,
      });
      return null;
    }
  }

  /**
   * Load an existing documentation job by ID.
   *
   * @param {string} projectId
   * @param {string} jobId
   * @param {string|null} [token]
   * @param {string} [repositoryName]
   */
  async loadExistingJob(projectId, jobId, token = null, repositoryName = null) {
    this.stop();
    token = token || getToken();

    jobStore.reset({
      realJob: true,
      projectId,
      jobId,
      repositoryName,
      status: "loading",
      aside: "Loading documentation job...",
    });

    try {
      const job = await fetchJob(jobId, token);
      const rawBatches = await fetchJobBatches(jobId, token).catch(() => []);
      const normalizedBatches = normalizeBatches(rawBatches);

      const committedIds = new Set();
      normalizedBatches.forEach((b) => {
        if (b.status === "done" || b.status === "committed") {
          committedIds.add(b.id);
          committedIds.add(Number(b.id));
        }
      });

      const totalBatches =
        rawBatches.length > 0
          ? Math.max(...rawBatches.map((r) => r.total_batches || 0), rawBatches.length)
          : normalizedBatches.length;

      const isCompleted = job.status === "completed";
      const isFailed = job.status === "failed";

      let initialEvents = [];
      if (normalizedBatches.length > 0) {
        initialEvents = [
          {
            id: `${jobId}-job-start`,
            time: "00:00:00",
            kind: "job",
            msg: "Documentation job started",
          },
          {
            id: `${jobId}-server`,
            time: "00:00:01",
            kind: "server",
            msg: "Repository uploaded and analyzed",
          },
          {
            id: `${jobId}-scan`,
            time: "00:00:02",
            kind: "scan",
            msg: "Repository files scanned",
          },
          {
            id: `${jobId}-ast`,
            time: "00:00:03",
            kind: "ast",
            msg: "AST parsing finished",
          },
          {
            id: `${jobId}-batching`,
            time: "00:00:04",
            kind: "batching",
            msg: `${totalBatches} documentation batches planned`,
          },
          ...normalizedBatches.map((b) => ({
            id: `${jobId}-batch-${b.id}`,
            time: "00:00:05",
            kind: "batch",
            msg: `Batch ${b.id}/${totalBatches} completed (${b.files?.length || 0} files)`,
          })),
        ];

        if (isCompleted) {
          initialEvents.push({
            id: `${jobId}-job-completed`,
            time: "00:00:06",
            kind: "job",
            msg: "Core AI documentation job completed",
          });
        }
      }

      jobStore.setState((s) => {
        let nextSteps = s.steps;
        if (isCompleted) {
          nextSteps = markAllStepsDone(s.steps, totalBatches, normalizedBatches.length);
        } else {
          nextSteps = {
            ...s.steps,
            gen: {
              ...s.steps.gen,
              state: "active",
              pct: totalBatches > 0 ? normalizedBatches.length / totalBatches : 0,
              detail: `${normalizedBatches.length} of ${totalBatches || "?"} batches generated`,
            },
          };
        }

        return {
          status: job.status,
          aside: isCompleted ? "Finished" : job.message || "Documentation in progress",
          batches: normalizedBatches,
          totalBatches,
          committedBatchIds: committedIds,
          events: initialEvents,
          steps: nextSteps,
          finished: isCompleted,
          generating: !isCompleted && !isFailed,
        };
      });

      await syncCommitsFromServer(jobId, token);

      if (!isCompleted && !isFailed) {
        this._wireStreamAndPoller(jobId, token);
      }
    } catch (err) {
      console.error("[RealJobController] Failed to load documentation job:", err);
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to load documentation job";
      jobStore.setState({
        status: "failed",
        jobError: msg,
        aside: msg,
      });
    }
  }

  /**
   * Restart documentation for a project. Updates URL afterwards.
   *
   * @param {string} projectId
   * @param {string} repositoryName
   * @param {string|null} [token]
   * @param {(newJobId: string) => void} [onUrlUpdate]
   */
  async restart(projectId, repositoryName = "repository", token = null, onUrlUpdate = null) {
    return this.startJob(projectId, repositoryName, token, onUrlUpdate);
  }

  /**
   * Stop all active streaming, polling, and timers.
   */
  stop() {
    if (this._batchRefreshTimer) {
      clearTimeout(this._batchRefreshTimer);
      this._batchRefreshTimer = null;
    }
    this._autoCommitRunning = false;
    this._refreshSeq++;

    if (this.stream) {
      this.stream.stop();
      this.stream = null;
    }

    if (this.poller) {
      this.poller.stop();
    }
  }

  _wireStreamAndPoller(jobId, token) {
    // 1. SSE Stream
    this.stream = new JobStream({
      jobId,
      onOpen: () => {
        jobStore.setState({ aside: "Connected to job event stream" });
      },
      onEvent: ({ eventType, payload, eventId }) => {
        this.handleStreamEvent(eventType, payload, eventId);
      },
      onError: () => {
        const currentStatus = jobStore.getState().status;
        if (currentStatus !== "completed" && currentStatus !== "failed") {
          jobStore.setState({ aside: "Job event stream reconnecting..." });
          // Ensure poller is active when stream drops
          this.poller.pollNow();
        }
      },
      onWatchdogTimeout: () => {
        console.warn("[RealJobController] Watchdog timeout on SSE stream: falling back to polling");
        this.poller.pollNow();
      },
    });

    this.stream.start();

    // 2. Poller Fallback
    this.poller.start({
      jobId,
      token,
      onUpdate: ({ job, batches }) => {
        this.handlePollerUpdate(job, batches);
      },
    });
  }

  handlePollerUpdate(job, rawBatches) {
    const state = jobStore.getState();
    if (!state.realJob || state.jobId !== job.job_id) return;

    const normalized = normalizeBatches(rawBatches || []);
    const total = Math.max(
      state.totalBatches,
      ...(rawBatches || []).map((r) => r.total_batches || 0),
      normalized.length
    );

    // Merge batches immutably
    const mergedBatches = normalized.map((sb) => {
      const local = state.batches.find((b) => b.id === sb.id || Number(b.id) === Number(sb.id));
      const isCommitting =
        state.committingBatchIds.has(sb.id) ||
        state.committingBatchIds.has(Number(sb.id));
      const isCommitted =
        state.committedBatchIds.has(sb.id) ||
        state.committedBatchIds.has(Number(sb.id));

      return mergeServerBatch(local, sb, { isCommitting, isCommitted });
    });

    const isCompleted = job.status === "completed";
    const isFailed = job.status === "failed";

    let nextSteps = state.steps;
    if (isCompleted) {
      nextSteps = markAllStepsDone(state.steps, total, mergedBatches.length);
    } else if (state.steps?.gen) {
      nextSteps = {
        ...state.steps,
        gen: {
          ...state.steps.gen,
          state: "active",
          pct: total > 0 ? Math.min(1, mergedBatches.length / total) : 0,
          detail: `${mergedBatches.length} of ${total || "?"} batches generated`,
        },
      };
    }

    jobStore.setState({
      status: job.status,
      aside: isCompleted
        ? "Finished"
        : job.message || `${mergedBatches.length} of ${total || "?"} batches generated`,
      batches: mergedBatches,
      totalBatches: total,
      steps: nextSteps,
      finished: isCompleted,
      generating: !isCompleted && !isFailed,
      jobError: isFailed ? job.message : state.jobError,
    });

    if (isCompleted || isFailed) {
      this.stop();
    }

    if (state.autoCommit) {
      this.autoCommitArrivals();
    }
  }

  handleStreamEvent(eventType, payload, eventId) {
    const event = payload || {};
    const stage = event.stage || eventType;
    const message = event.message || stage;
    const progress = event.progress;

    const state = jobStore.getState();

    // Cross-run filter
    if (
      event.job_id &&
      state.jobId &&
      String(event.job_id).toLowerCase().trim() !== String(state.jobId).toLowerCase().trim()
    ) {
      return;
    }

    this._lastSseAt = Date.now();

    const evId =
      event.event_id ||
      eventId ||
      `${event.job_id || state.jobId || "job"}-${event.timestamp || ""}-${stage}-${message}`;

    const time = event.timestamp
      ? new Date(event.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      : clockNow();

    // 1. Add event if not duplicate (cap at 200)
    let nextEvents = state.events;
    const exists = state.events.some(
      (e) => e.id === evId || (e.msg === message && e.kind === stage && e.time === time)
    );

    if (!exists) {
      // Remove any poll-generated stand-in with same text
      const filtered = state.events.filter((e) => !(e.source === "poll" && e.msg === message));
      nextEvents = [...filtered, { id: evId, time, kind: stage, msg: message }];
      if (nextEvents.length > 200) {
        nextEvents.shift();
      }
    }

    // 2. Step progression
    const nextSteps = { ...state.steps };
    let nextTotalBatches = state.totalBatches;

    if (stage === "upload") {
      if (nextSteps.upload) {
        nextSteps.upload = {
          ...nextSteps.upload,
          state: event.type === "completed" ? "done" : "active",
          detail: message,
        };
      }
    } else if (stage === "server") {
      if (nextSteps.upload) nextSteps.upload = { ...nextSteps.upload, state: "done" };
      if (nextSteps.server) {
        nextSteps.server = {
          ...nextSteps.server,
          state: event.type === "completed" ? "done" : "active",
          detail: message,
        };
      }
    } else if (stage === "ast") {
      if (nextSteps.upload) nextSteps.upload = { ...nextSteps.upload, state: "done" };
      if (nextSteps.server) {
        nextSteps.server = {
          ...nextSteps.server,
          state: event.type === "completed" ? "done" : "active",
          detail: message,
        };
      }
    } else if (stage === "scan") {
      if (nextSteps.upload) nextSteps.upload = { ...nextSteps.upload, state: "done" };
      if (nextSteps.server) nextSteps.server = { ...nextSteps.server, state: "done" };
      if (nextSteps.scan) {
        nextSteps.scan = {
          ...nextSteps.scan,
          state: event.type === "completed" ? "done" : "active",
          detail: message,
          pct: progress?.total ? Math.min(1, (progress.current || 0) / progress.total) : nextSteps.scan.pct,
        };
      }
    } else if (stage === "security" || stage === "secret") {
      if (nextSteps.scan) nextSteps.scan = { ...nextSteps.scan, state: "done" };
      if (nextSteps.secrets) {
        nextSteps.secrets = {
          ...nextSteps.secrets,
          state: event.type === "completed" ? "done" : "active",
          detail: message,
        };
      }
    } else if (stage === "redaction" || stage === "secure") {
      if (nextSteps.secrets) nextSteps.secrets = { ...nextSteps.secrets, state: "done" };
      if (nextSteps.secure) {
        nextSteps.secure = {
          ...nextSteps.secure,
          state: event.type === "completed" ? "done" : "active",
          detail: message,
        };
      }
    } else if (stage === "batching") {
      if (nextSteps.secure) nextSteps.secure = { ...nextSteps.secure, state: "done" };
      if (nextSteps.batch) {
        nextSteps.batch = {
          ...nextSteps.batch,
          state: event.type === "completed" ? "done" : "active",
          detail: message,
          pct: progress?.total ? Math.min(1, (progress.current || 0) / progress.total) : nextSteps.batch.pct,
        };
        if (progress?.total) {
          nextTotalBatches = progress.total;
        }
      }
    } else if (stage === "generation" || stage === "gen") {
      if (nextSteps.batch) nextSteps.batch = { ...nextSteps.batch, state: "done" };
      if (nextSteps.gen) {
        nextSteps.gen = {
          ...nextSteps.gen,
          state: event.type === "completed" ? "done" : "active",
          detail: message,
          pct: progress?.total ? Math.min(1, (progress.current || 0) / progress.total) : nextSteps.gen.pct,
        };
        if (progress?.total) {
          nextTotalBatches = progress.total;
        }
      }
    } else if (stage === "batch") {
      if (nextSteps.batch) nextSteps.batch = { ...nextSteps.batch, state: "done" };
      this.scheduleBatchRefresh(300);
    } else if (stage === "commit") {
      this.scheduleBatchRefresh(300);
      if (state.jobId) {
        syncCommitsFromServer(state.jobId, getToken());
      }
    } else if (stage === "job") {
      if (event.type === "started") {
        jobStore.setState({
          status: "running",
          generating: true,
          events: nextEvents,
        });
        return;
      }
      if (event.type === "completed" || eventType === "done") {
        this.stop();
        const doneSteps = markAllStepsDone(nextSteps, nextTotalBatches, state.batches.length);
        const toast = {
          id: Date.now(),
          kind: "ok",
          title: "Documentation completed",
          text: "Your repository has been successfully documented.",
        };
        jobStore.setState((s) => ({
          status: "completed",
          finished: true,
          generating: false,
          aside: "Documentation Complete ✓",
          steps: doneSteps,
          events: nextEvents,
          toasts: [toast, ...s.toasts.slice(0, 5)],
        }));
        this.refreshBatches(getToken());
        return;
      }
      if (event.type === "failed") {
        this.stop();
        jobStore.setState({
          status: "failed",
          finished: false,
          generating: false,
          jobError: message,
          aside: message,
          events: nextEvents,
        });
        return;
      }
    }

    if (progress?.total) {
      nextTotalBatches = progress.total;
    }

    jobStore.setState({
      events: nextEvents,
      steps: nextSteps,
      totalBatches: nextTotalBatches,
    });
  }

  scheduleBatchRefresh(delay = 300) {
    if (this._batchRefreshTimer) {
      clearTimeout(this._batchRefreshTimer);
    }
    this._batchRefreshTimer = setTimeout(() => {
      this._batchRefreshTimer = null;
      this.refreshBatches(getToken());
    }, delay);
  }

  async refreshBatches(token = null) {
    const state = jobStore.getState();
    const jobId = state.jobId;
    if (!jobId) return;

    token = token || getToken();
    const seq = ++this._refreshSeq;

    try {
      const results = await fetchJobBatches(jobId, token);
      if (seq !== this._refreshSeq || jobId !== jobStore.getState().jobId) {
        return; // Stale response
      }

      const currentState = jobStore.getState();
      const normalized = normalizeBatches(results);
      const total = Math.max(
        currentState.totalBatches,
        ...results.map((r) => r.total_batches || 0),
        normalized.length
      );

      const merged = normalized.map((sb) => {
        const local = currentState.batches.find((b) => b.id === sb.id || Number(b.id) === Number(sb.id));
        const isCommitting =
          currentState.committingBatchIds.has(sb.id) ||
          currentState.committingBatchIds.has(Number(sb.id));
        const isCommitted =
          currentState.committedBatchIds.has(sb.id) ||
          currentState.committedBatchIds.has(Number(sb.id));
        return mergeServerBatch(local, sb, { isCommitting, isCommitted });
      });

      let nextSteps = currentState.steps;
      if (currentState.status === "completed") {
        nextSteps = markAllStepsDone(currentState.steps, total, merged.length);
      } else if (currentState.steps?.gen) {
        nextSteps = {
          ...currentState.steps,
          gen: {
            ...currentState.steps.gen,
            pct: total > 0 ? Math.min(1, merged.length / total) : 0,
            detail: `${merged.length} of ${total || "?"} batches generated`,
          },
        };
      }

      jobStore.setState({
        batches: merged,
        totalBatches: total,
        steps: nextSteps,
      });

      if (currentState.autoCommit) {
        this.autoCommitArrivals();
      }
    } catch (err) {
      if (seq !== this._refreshSeq) return;
      console.warn("[RealJobController] Failed to refresh batches:", err);
    }
  }

  async fetchBatchDetail(batchId, token = null) {
    const state = jobStore.getState();
    const jobId = state.jobId;
    if (!jobId || !batchId) return;

    token = token || getToken();
    try {
      const raw = await fetchBatch(jobId, batchId, token);
      if (!raw) return;
      const normalized = normalizeBatch(raw);

      jobStore.setState((s) => {
        const idx = s.batches.findIndex(
          (b) => b.id === batchId || Number(b.id) === Number(batchId)
        );
        if (idx < 0) return {};

        const local = s.batches[idx];
        const isCommitting =
          s.committingBatchIds.has(batchId) ||
          s.committingBatchIds.has(Number(batchId));
        const isCommitted =
          s.committedBatchIds.has(batchId) ||
          s.committedBatchIds.has(Number(batchId));

        const merged = mergeServerBatch(local, normalized, { isCommitting, isCommitted });
        const updated = [...s.batches];
        updated[idx] = merged;
        return { batches: updated };
      });
    } catch (err) {
      console.warn(`[RealJobController] Failed to fetch batch detail for ${batchId}:`, err);
    }
  }

  async autoCommitArrivals() {
    if (this._autoCommitRunning) return;
    this._autoCommitRunning = true;

    try {
      const state = jobStore.getState();
      for (const b of state.batches) {
        const currentState = jobStore.getState();
        if (!currentState.autoCommit) break;
        if (b.status === "done" || b.status === "committed") continue;
        if (
          currentState.committedBatchIds.has(b.id) ||
          currentState.committedBatchIds.has(Number(b.id)) ||
          currentState.committingBatchIds.has(b.id) ||
          currentState.committingBatchIds.has(Number(b.id))
        ) {
          continue;
        }
        if (!(b.files?.length || b.readme)) continue;

        await commitBatch(currentState.jobId, b, getToken(), { auto: true });
      }
    } finally {
      this._autoCommitRunning = false;
    }
  }
}

export const realJobController = new RealJobController();
