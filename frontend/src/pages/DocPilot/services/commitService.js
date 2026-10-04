import { commitJobBatch, commitAllJobBatches, getJobCommits } from "../../../api/jobs.js";
import { extractCommitInfo, normalizeCommit } from "../utils/batchAdapter.js";
import { stableSha, clockNow } from "../utils/format.js";
import { jobStore } from "../store/jobStore.js";

/**
 * Helper to push an event into the store's events feed.
 * @param {string} kind
 * @param {string} msg
 */
function pushLocalCommitEvent(kind, msg) {
  jobStore.setState((state) => {
    const jobId = state.jobId || "job";
    const newEvent = {
      id: `${jobId}-local-${Date.now()}-${kind}-${msg}`,
      time: clockNow(),
      kind,
      msg,
    };
    const updatedEvents = [...state.events, newEvent];
    if (updatedEvents.length > 200) {
      updatedEvents.shift();
    }
    return { events: updatedEvents };
  });
}

/**
 * Fetch commits from the backend for a job.
 * @param {string} jobId
 * @param {string|null} [token]
 * @returns {Promise<any[]|null>}
 */
export async function fetchCommits(jobId, token = null) {
  if (!jobId) return null;
  try {
    const list = await getJobCommits(jobId, token);
    if (!Array.isArray(list)) return null;
    return list.map(normalizeCommit);
  } catch (err) {
    console.warn("[commitService] Failed to fetch job commits:", err);
    return null;
  }
}

/**
 * Sync server commits with the store's commits.
 * @param {string} jobId
 * @param {string|null} [token]
 */
export async function syncCommitsFromServer(jobId, token = null) {
  const serverCommits = await fetchCommits(jobId, token);
  if (!serverCommits) return;

  jobStore.setState((state) => {
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

    serverCommits.forEach(add);
    (state.commits || []).forEach(add);

    for (const b of state.batches || []) {
      const isCommitted =
        state.committedBatchIds?.has(b.id) ||
        state.committedBatchIds?.has(Number(b.id)) ||
        b.status === "done" ||
        b.status === "committed";
      if (!isCommitted) continue;

      if (covered.has(Number(b.id))) continue;

      const numFiles = b.files?.length || 0;
      const n = (b.files || []).flatMap((f) => f.hunks || []).length || (b.readme ? 1 : 1);
      add({
        id: `commit-batch-${b.id}`,
        sha: b.commitSha || stableSha(`${state.jobId || "local"}:${b.id}`),
        msg:
          numFiles > 0
            ? `docs: batch ${b.id}, ${numFiles} file${numFiles > 1 ? "s" : ""}`
            : b.readme
            ? `docs: batch ${b.id}, README documentation`
            : `docs: batch ${b.id}`,
        n,
        batchIds: [Number(b.id)],
        at: b.committedAt || null,
        source: "derived",
      });
    }

    merged.sort(
      (a, b) =>
        (b.at || 0) - (a.at || 0) ||
        (b.batchIds?.[0] || 0) - (a.batchIds?.[0] || 0)
    );

    return {
      commits: merged.slice(0, 100),
      commitCount: merged.length,
    };
  });
}

/**
 * Commit a single batch to the backend with tracking.
 *
 * @param {string} jobId
 * @param {any} batch
 * @param {string|null} [token]
 * @param {{ auto?: boolean, msg?: string|null }} [options]
 * @returns {Promise<boolean>}
 */
export async function commitBatch(jobId, batch, token = null, options = {}) {
  if (!batch || !jobId) return false;
  const id = batch.id;
  const { auto = false, msg = null } = options;

  const state = jobStore.getState();
  const isCommitted =
    state.committedBatchIds.has(id) ||
    state.committedBatchIds.has(Number(id)) ||
    batch.status === "done" ||
    batch.status === "committed";

  if (isCommitted) return true;

  const isCommitting =
    state.committingBatchIds.has(id) || state.committingBatchIds.has(Number(id));
  if (isCommitting) return false;

  const hunks = (batch.files || []).flatMap((f) => f.hunks || []);
  const approved = hunks.filter((h) => h.status === "committed").length;
  const pending = hunks.filter((h) => h.status === "pending").length;

  // Everything was skipped: nothing to write, close review locally
  if (hunks.length > 0 && approved + pending === 0) {
    jobStore.setState((s) => ({
      batches: s.batches.map((b) =>
        b.id === id || Number(b.id) === Number(id)
          ? { ...b, status: "done", fresh: false }
          : b
      ),
      flash: null,
      modal: { ...s.modal, animate: false },
    }));
    pushLocalCommitEvent("commit", `Batch ${id} reviewed, every change skipped (nothing committed)`);
    return true;
  }

  const commitMsg =
    msg ||
    (hunks.length
      ? `docs: batch ${id}, ${batch.files?.length || 0} file${(batch.files?.length || 0) === 1 ? "" : "s"}`
      : batch.readme
      ? `docs: batch ${id}, README documentation`
      : `docs: batch ${id}`);

  // Mark as committing
  jobStore.setState((s) => {
    const nextCommitting = new Set(s.committingBatchIds);
    nextCommitting.add(id);
    nextCommitting.add(Number(id));
    return { committingBatchIds: nextCommitting };
  });

  let result;
  try {
    result = await commitJobBatch(jobId, id, token);
  } catch (error) {
    console.error(`[commitService] Failed to commit batch ${id}:`, error);

    // Un-stage hunks so user can retry, clear committing
    jobStore.setState((s) => {
      const nextCommitting = new Set(s.committingBatchIds);
      nextCommitting.delete(id);
      nextCommitting.delete(Number(id));

      const updatedBatches = s.batches.map((b) => {
        if (b.id !== id && Number(b.id) !== Number(id)) return b;
        return {
          ...b,
          files: (b.files || []).map((f) => ({
            ...f,
            hunks: (f.hunks || []).map((h) =>
              h.status === "committed" && !h.sha ? { ...h, status: "pending" } : h
            ),
          })),
        };
      });

      const text =
        error?.response?.data?.detail || error?.message || `Failed to commit batch ${id}.`;

      const nextToasts = auto
        ? s.toasts
        : [
            {
              id: Date.now(),
              kind: "warn",
              title: "Commit failed",
              text,
            },
            ...s.toasts.slice(0, 5),
          ];

      return {
        committingBatchIds: nextCommitting,
        batches: updatedBatches,
        toasts: nextToasts,
      };
    });

    const text =
      error?.response?.data?.detail || error?.message || `Failed to commit batch ${id}.`;
    pushLocalCommitEvent("commit", `Batch ${id} commit failed: ${text}`);
    return false;
  }

  const info = extractCommitInfo(result);
  const sha = info.sha || stableSha(`${jobId}:${id}`);

  // Apply committed state immutably to store
  jobStore.setState((s) => {
    const nextCommitting = new Set(s.committingBatchIds);
    nextCommitting.delete(id);
    nextCommitting.delete(Number(id));

    const nextCommitted = new Set(s.committedBatchIds);
    nextCommitted.add(id);
    nextCommitted.add(Number(id));

    const updatedBatches = s.batches.map((b) => {
      if (b.id !== id && Number(b.id) !== Number(id)) return b;
      return {
        ...b,
        status: "done",
        fresh: false,
        files: (b.files || []).map((f) => ({
          ...f,
          hunks: (f.hunks || []).map((h) =>
            h.status === "pending" || h.status === "committed"
              ? { ...h, status: "committed", sha }
              : h
          ),
        })),
      };
    });

    const newCommit = {
      id: `commit-batch-${id}`,
      sha,
      msg: info.message || commitMsg + (auto ? " (auto-commit)" : ""),
      n: info.count ?? (approved + pending || (batch.readme ? 1 : 1)),
      batchIds: [Number(id)],
      at: info.at || Date.now(),
      source: "backend",
    };

    const nextCommits = [newCommit, ...s.commits.filter((c) => c.id !== newCommit.id)];

    return {
      committingBatchIds: nextCommitting,
      committedBatchIds: nextCommitted,
      batches: updatedBatches,
      commits: nextCommits,
      commitCount: nextCommits.length,
      flash: null,
      modal: { ...s.modal, animate: false },
    };
  });

  pushLocalCommitEvent("commit", `Batch ${id} committed`);

  // Confirm with the server
  syncCommitsFromServer(jobId, token);
  return true;
}

/**
 * Commit all ready batches in a repository.
 *
 * @param {string} jobId
 * @param {any[]} batches
 * @param {string} [repositoryName]
 * @param {string|null} [token]
 * @returns {Promise<boolean>}
 */
export async function commitAll(jobId, batches, repositoryName = "repository", token = null) {
  if (!jobId) return false;
  const state = jobStore.getState();

  const ready = (batches || state.batches).filter((b) => {
    const isCommitted =
      state.committedBatchIds.has(b.id) ||
      state.committedBatchIds.has(Number(b.id)) ||
      b.status === "done" ||
      b.status === "committed";
    const isCommitting =
      state.committingBatchIds.has(b.id) ||
      state.committingBatchIds.has(Number(b.id));

    return !isCommitted && !isCommitting && (b.files?.length || b.readme);
  });

  if (!ready.length) {
    jobStore.setState({ autoCommit: true, confirmRepo: false, modal: { ...state.modal, open: false } });
    return true;
  }

  // Mark all ready as committing
  jobStore.setState((s) => {
    const nextCommitting = new Set(s.committingBatchIds);
    ready.forEach((b) => {
      nextCommitting.add(b.id);
      nextCommitting.add(Number(b.id));
    });
    return {
      confirmRepo: false,
      modal: { ...s.modal, open: false },
      committingBatchIds: nextCommitting,
    };
  });

  let result;
  try {
    result = await commitAllJobBatches(jobId, token);
  } catch (error) {
    console.error("[commitService] Failed to commit all batches:", error);
    jobStore.setState((s) => {
      const nextCommitting = new Set(s.committingBatchIds);
      ready.forEach((b) => {
        nextCommitting.delete(b.id);
        nextCommitting.delete(Number(b.id));
      });
      const text =
        error?.response?.data?.detail || error?.message || "Could not commit the repository.";
      return {
        committingBatchIds: nextCommitting,
        toasts: [
          {
            id: Date.now(),
            kind: "warn",
            title: "Commit failed",
            text,
          },
          ...s.toasts.slice(0, 5),
        ],
      };
    });
    return false;
  }

  const info = extractCommitInfo(result);
  const sha =
    info.sha || stableSha(`${jobId}:all:${ready.map((b) => b.id).join(",")}`);

  let n = 0;
  jobStore.setState((s) => {
    const nextCommitting = new Set(s.committingBatchIds);
    const nextCommitted = new Set(s.committedBatchIds);
    const readyIds = new Set(ready.map((b) => Number(b.id)));

    ready.forEach((b) => {
      nextCommitting.delete(b.id);
      nextCommitting.delete(Number(b.id));
      nextCommitted.add(b.id);
      nextCommitted.add(Number(b.id));
    });

    const updatedBatches = s.batches.map((b) => {
      if (!readyIds.has(Number(b.id))) return b;
      const hs = (b.files || []).flatMap((f) => f.hunks || []);
      n += hs.filter((h) => h.status !== "skipped").length || (b.readme ? 1 : 1);
      return {
        ...b,
        status: "done",
        fresh: false,
        files: (b.files || []).map((f) => ({
          ...f,
          hunks: (f.hunks || []).map((h) =>
            h.status === "pending" || h.status === "committed"
              ? { ...h, status: "committed", sha }
              : h
          ),
        })),
      };
    });

    const newCommit = {
      id: `commit-repo-${sha}`,
      sha,
      msg:
        info.message ||
        `docs: AI documentation for ${repositoryName || "repository"}, ${ready.length} batch${ready.length > 1 ? "es" : ""}`,
      n: info.count ?? n,
      batchIds: ready.map((b) => Number(b.id)),
      at: info.at || Date.now(),
      source: "backend",
    };

    const nextCommits = [newCommit, ...s.commits.filter((c) => c.id !== newCommit.id)];

    const toastText = `${ready.length} batch${ready.length > 1 ? "es" : ""} committed. Batches that arrive from now on are committed automatically.`;
    const nextToasts = [
      {
        id: Date.now(),
        kind: "ok",
        title: "Repository committed",
        text: toastText,
      },
      ...s.toasts.slice(0, 5),
    ];

    return {
      autoCommit: true,
      committingBatchIds: nextCommitting,
      committedBatchIds: nextCommitted,
      batches: updatedBatches,
      commits: nextCommits,
      commitCount: nextCommits.length,
      toasts: nextToasts,
    };
  });

  pushLocalCommitEvent(
    "commit",
    `Repository commit ${sha}: ${ready.length} batch${ready.length > 1 ? "es" : ""} committed`
  );

  syncCommitsFromServer(jobId, token);
  return true;
}
