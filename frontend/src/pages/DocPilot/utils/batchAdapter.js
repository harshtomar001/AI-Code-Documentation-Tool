/**
 * Convert Core AI BatchResult objects into the data shape
 * expected by the existing DocPilot review UI.
 */

export function normalizePath(path) {
  return (path || "").replace(/\\/g, "/");
}

function computeDiffRows(before, after) {
  if (!before && !after) return [];
  const beforeLines = (before || "").split("\n");
  const afterLines = (after || "").split("\n");

  let prefixCount = 0;
  while (
    prefixCount < beforeLines.length &&
    prefixCount < afterLines.length &&
    beforeLines[prefixCount] === afterLines[prefixCount]
  ) {
    prefixCount++;
  }

  let suffixCount = 0;
  while (
    suffixCount < beforeLines.length - prefixCount &&
    suffixCount < afterLines.length - prefixCount &&
    beforeLines[beforeLines.length - 1 - suffixCount] ===
      afterLines[afterLines.length - 1 - suffixCount]
  ) {
    suffixCount++;
  }

  const rows = [];

  for (let i = 0; i < prefixCount; i++) {
    rows.push({
      t: " ",
      before: beforeLines[i],
      after: afterLines[i],
    });
  }

  const beforeMiddle = beforeLines.slice(
    prefixCount,
    beforeLines.length - suffixCount
  );
  const afterMiddle = afterLines.slice(
    prefixCount,
    afterLines.length - suffixCount
  );

  if (
    beforeMiddle.length > 0 &&
    afterMiddle.length > 0 &&
    beforeMiddle.length === afterMiddle.length
  ) {
    for (let i = 0; i < beforeMiddle.length; i++) {
      rows.push({
        t: "m",
        before: beforeMiddle[i],
        after: afterMiddle[i],
      });
    }
  } else {
    for (const bLine of beforeMiddle) {
      rows.push({
        t: "r",
        before: bLine,
        after: null,
      });
    }
    for (const aLine of afterMiddle) {
      rows.push({
        t: "a",
        before: null,
        after: aLine,
      });
    }
  }

  const suffixStart = afterLines.length - suffixCount;
  for (let i = 0; i < suffixCount; i++) {
    rows.push({
      t: " ",
      before: beforeLines[beforeLines.length - suffixCount + i],
      after: afterLines[suffixStart + i],
    });
  }

  return rows;
}

function changeToHunk(change, index, beforeAfterMap, filePath) {
  const normPath = normalizePath(filePath);
  const bac =
    beforeAfterMap.get(`${normPath}::${change.target}`) ||
    beforeAfterMap.get(change.target);

  const before = bac?.before || "";
  const after = bac?.after || "";
  const content = change.content ?? "";

  let rows = [];
  if (before || after) {
    rows = computeDiffRows(before, after);
  }
  if (!rows.length) {
    rows = [
      {
        t: "a",
        before: null,
        after: content,
      },
    ];
  }

  return {
    title:
      change.target ||
      `${change.type || "documentation"} change ${index + 1}`,
    target: change.target || `change_${index + 1}`,
    type: change.type || bac?.type || "docstring",
    content,
    before,
    after,
    file: normPath,
    rows,
    start: 1,
    status: "pending",
    sha: null,
  };
}

export function normalizeBatch(batchResult) {
  const beforeAfterList = batchResult.changes ?? [];
  const beforeAfterMap = new Map();

  for (const bac of beforeAfterList) {
    const normFile = normalizePath(bac.file);
    beforeAfterMap.set(`${normFile}::${bac.target}`, bac);
    beforeAfterMap.set(bac.target, bac);
  }

  const filesMap = new Map();

  // First, process files from batchResult.files
  for (const file of batchResult.files ?? []) {
    const normFile = normalizePath(file.path);
    const hunks = (file.changes ?? []).map((ch, idx) =>
      changeToHunk(ch, idx, beforeAfterMap, normFile)
    );
    filesMap.set(normFile, {
      name: normFile,
      hunks,
    });
  }

  // Next, if there are BeforeAfterChange items not captured yet, add them
  for (const bac of beforeAfterList) {
    const normFile = normalizePath(bac.file);
    if (!filesMap.has(normFile)) {
      filesMap.set(normFile, {
        name: normFile,
        hunks: [],
      });
    }
    const currentFile = filesMap.get(normFile);
    const alreadyExists = currentFile.hunks.some(
      (h) => h.target === bac.target
    );
    if (!alreadyExists) {
      currentFile.hunks.push(
        changeToHunk(
          {
            type: bac.type,
            target: bac.target,
            content: bac.after,
          },
          currentFile.hunks.length,
          beforeAfterMap,
          normFile
        )
      );
    }
  }

  const files = Array.from(filesMap.values());
  const isCommitted =
    batchResult.status === "committed" || batchResult.status === "done";

  const commitSha =
    batchResult.commit_sha ||
    batchResult.commit?.sha ||
    batchResult.commit_id ||
    null;

  if (isCommitted) {
    for (const file of files) {
      for (const hunk of file.hunks) {
        hunk.status = "committed";
        if (commitSha) hunk.sha = String(commitSha).slice(0, 7);
      }
    }
  }

  return {
    id: batchResult.batch_id,
    total_batches: batchResult.total_batches ?? 1,
    status: isCommitted
      ? "done"
      : batchResult.status === "completed"
      ? "ready"
      : batchResult.status || "ready",
    p: 1,
    worker: 0,
    fresh: !isCommitted,
    page: 0,
    apSeen: false,
    files,
    changes: beforeAfterList,
    readme: batchResult.readme ?? null,
    commitSha: commitSha ? String(commitSha).slice(0, 7) : null,
    committedAt: Date.parse(batchResult.committed_at || "") || null,
  };
}

export function normalizeBatches(batchResults) {
  if (!Array.isArray(batchResults)) {
    return [];
  }
  return batchResults
    .slice()
    .sort((a, b) => (a.batch_id ?? 0) - (b.batch_id ?? 0))
    .map(normalizeBatch);
}


/**
 * Backends differ in what the commit endpoints return (axios response vs body,
 * sha / commit_sha / commit.sha ...). Normalise whatever comes back.
 */
export function extractCommitInfo(result) {
  const d = result?.data ?? result ?? {};
  const c = d.commit ?? d;
  const sha = c.sha || c.commit_sha || c.commit_id || d.commit_sha || null;
  return {
    sha: sha ? String(sha).slice(0, 7) : null,
    message: c.message || c.commit_message || d.message || null,
    at: Date.parse(c.committed_at || c.created_at || c.timestamp || "") || null,
    count: c.changes ?? c.change_count ?? c.files_changed ?? null,
    batchIds: d.batch_ids || d.committed_batches || (c.batch_id != null ? [c.batch_id] : null),
  };
}

/** One commit row as returned by an optional GET /jobs/{id}/commits endpoint. */
export function normalizeCommit(raw, index = 0) {
  const full = raw.sha || raw.commit_sha || raw.id || `commit-${index}`;
  const batchIds = raw.batch_ids || (raw.batch_id != null ? [raw.batch_id] : []);
  return {
    id: String(full),
    sha: String(full).slice(0, 7),
    msg: raw.message || raw.msg || "docs: documentation update",
    n: raw.changes ?? raw.change_count ?? raw.files_changed ?? 1,
    batchIds: batchIds.map(Number),
    at: Date.parse(raw.committed_at || raw.created_at || raw.timestamp || "") || null,
    source: "server",
  };
}
