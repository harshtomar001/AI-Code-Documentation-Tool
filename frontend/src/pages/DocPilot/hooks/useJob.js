import { useCallback } from "react";
import { useJobSelector, jobStore } from "../store/jobStore.js";
import { batchState, changesIn, pendingCount } from "../engine/helpers.js";

/**
 * Compute counts of batches in each state.
 */
export function computeCounts(batches = [], committingBatchIds = new Set(), committedBatchIds = new Set()) {
  let queued = 0;
  let generating = 0;
  let ready = 0;
  let done = 0;

  for (const b of batches) {
    const s = batchState(b);
    const isCommitted =
      committedBatchIds.has(b.id) ||
      committedBatchIds.has(Number(b.id)) ||
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

/**
 * Compute tally of all hunks/changes in batches.
 */
export function computeTally(batches = [], committingBatchIds = new Set(), committedBatchIds = new Set(), realJob = false) {
  let total = 0, committed = 0, skipped = 0, staged = 0;

  for (const b of batches) {
    const isBatchCommitted =
      committedBatchIds.has(b.id) ||
      committedBatchIds.has(Number(b.id)) ||
      b.status === "done" ||
      b.status === "committed";

    let batchHasHunks = false;

    for (const f of b.files || []) {
      for (const h of f.hunks || []) {
        batchHasHunks = true;
        total++;
        if (h.status === "committed" || isBatchCommitted) {
          if (realJob && !isBatchCommitted && !h.sha) staged++;
          else committed++;
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

export function isBatchCommitting(batchId, committingBatchIds) {
  if (!committingBatchIds) return false;
  return (
    committingBatchIds.has(batchId) ||
    committingBatchIds.has(Number(batchId)) ||
    committingBatchIds.has(String(batchId))
  );
}

export function isBatchCommitted(batchId, committedBatchIds) {
  if (!committedBatchIds) return false;
  return (
    committedBatchIds.has(batchId) ||
    committedBatchIds.has(Number(batchId)) ||
    committedBatchIds.has(String(batchId))
  );
}

/**
 * Primary state hook for DocPilot.
 * Returns full store state with helper methods attached.
 */
export function useJob() {
  const state = useJobSelector((s) => s);

  const isCommitting = useCallback(
    (id) => isBatchCommitting(id, state.committingBatchIds),
    [state.committingBatchIds]
  );

  const isCommitted = useCallback(
    (id) => isBatchCommitted(id, state.committedBatchIds),
    [state.committedBatchIds]
  );

  const counts = useCallback(
    () => computeCounts(state.batches, state.committingBatchIds, state.committedBatchIds),
    [state.batches, state.committingBatchIds, state.committedBatchIds]
  );

  const tally = useCallback(
    () =>
      computeTally(
        state.batches,
        state.committingBatchIds,
        state.committedBatchIds,
        state.realJob
      ),
    [state.batches, state.committingBatchIds, state.committedBatchIds, state.realJob]
  );

  const findBatch = useCallback(
    (id) =>
      state.batches.find((x) => x.id === id || Number(x.id) === Number(id)) || null,
    [state.batches]
  );

  const stepMs = useCallback(
    (key) => {
      const s = state.steps[key];
      if (!s || s.t0 == null) return null;
      return (s.t1 ?? Date.now()) - s.t0;
    },
    [state.steps]
  );

  return {
    ...state,
    isBatchCommitting: isCommitting,
    isBatchCommitted: isCommitted,
    counts,
    tally,
    findBatch,
    stepMs,
  };
}

/** Hook to read only events. Re-renders only when events change. */
export function useJobEvents() {
  return useJobSelector((s) => s.events);
}

/** Hook to read only batches and committing/committed sets. */
export function useJobBatches() {
  const batches = useJobSelector((s) => s.batches);
  const committingBatchIds = useJobSelector((s) => s.committingBatchIds);
  const committedBatchIds = useJobSelector((s) => s.committedBatchIds);

  return {
    batches,
    committingBatchIds,
    committedBatchIds,
    isBatchCommitting: (id) => isBatchCommitting(id, committingBatchIds),
    isBatchCommitted: (id) => isBatchCommitted(id, committedBatchIds),
  };
}

/** Hook to read only commits. Re-renders only when commits change. */
export function useJobCommits() {
  const commits = useJobSelector((s) => s.commits);
  const commitCount = useJobSelector((s) => s.commitCount);
  const batches = useJobSelector((s) => s.batches);
  const committingBatchIds = useJobSelector((s) => s.committingBatchIds);
  const committedBatchIds = useJobSelector((s) => s.committedBatchIds);
  const realJob = useJobSelector((s) => s.realJob);
  const repositoryName = useJobSelector((s) => s.repositoryName);

  return {
    commits,
    commitCount,
    batches,
    committingBatchIds,
    committedBatchIds,
    realJob,
    repositoryName,
    isBatchCommitting: (id) => isBatchCommitting(id, committingBatchIds),
    isBatchCommitted: (id) => isBatchCommitted(id, committedBatchIds),
    tally: () => computeTally(batches, committingBatchIds, committedBatchIds, realJob),
  };
}
