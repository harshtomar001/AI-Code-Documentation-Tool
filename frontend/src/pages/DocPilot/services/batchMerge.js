/**
 * Pure function to merge a batch from the server with the local batch state.
 *
 * Rules:
 *  - being committed right now -> keep local, a poll/refresh must not touch it
 *  - committed on the server   -> server copy wins
 *  - committed locally         -> keep local (server may lag a moment)
 *  - otherwise                 -> server copy, but keep the user's review
 *                                 progress (approved / skipped hunks)
 *
 * Immutable: never mutates input arguments.
 *
 * @param {any|null|undefined} local - The existing local batch in store, if any.
 * @param {any} server - The new normalized batch from the backend.
 * @param {{ isCommitting?: boolean, isCommitted?: boolean }} [options]
 * @returns {any} A new merged batch object.
 */
export function mergeServerBatch(local, server, options = {}) {
  const { isCommitting = false, isCommitted = false } = options;

  if (local && isCommitting) {
    return local;
  }

  if (server.status === "done" || server.status === "committed") {
    return {
      ...server,
      page: local?.page ?? 0,
      fresh: false,
    };
  }

  const locallyFinal =
    isCommitted ||
    local?.status === "done" ||
    local?.status === "committed";

  if (local && locallyFinal) {
    return {
      ...local,
      status: "done",
      fresh: false,
    };
  }

  if (!local) {
    return server;
  }

  // Carry review progress over to the fresh server copy immutably
  const localFiles = local.files || [];
  const updatedFiles = (server.files || []).map((sf) => {
    const lf = localFiles.find((f) => f.name === sf.name);
    if (!lf) {
      return sf;
    }

    const localHunks = lf.hunks || [];
    const updatedHunks = (sf.hunks || []).map((sh, i) => {
      const lh = localHunks.find((h) => h.target && h.target === sh.target) || localHunks[i];
      if (lh && (lh.status === "committed" || lh.status === "skipped")) {
        return {
          ...sh,
          status: lh.status,
          sha: lh.sha,
        };
      }
      return sh;
    });

    return {
      ...sf,
      hunks: updatedHunks,
    };
  });

  return {
    ...server,
    files: updatedFiles,
    page: local.page ?? 0,
    fresh: local.fresh ?? server.fresh,
    apSeen: local.apSeen,
  };
}
