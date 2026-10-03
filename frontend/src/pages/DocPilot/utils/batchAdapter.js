/**
 * Convert Core AI BatchResult objects into the data shape
 * expected by the existing DocPilot review UI.
 */

function changeToHunk(change, index) {
  const content = change.content ?? "";

  return {
    title:
      change.target ||
      `${change.type || "documentation"} change ${index + 1}`,

    rows: [
      {
        t: "a",
        before: null,
        after: content,
      },
    ],

    start: 1,
    status: "pending",
    sha: null,
  };
}

function fileToDocPilotFile(file) {
  return {
    name: file.path,
    hunks: (file.changes ?? []).map(changeToHunk),
  };
}

export function normalizeBatch(batchResult) {
  return {
    id: batchResult.batch_id,
    status: "ready",
    p: 1,
    worker: 0,
    fresh: true,
    page: 0,
    apSeen: false,

    files: (batchResult.files ?? []).map(fileToDocPilotFile),

    readme: batchResult.readme ?? null,
  };
}

export function normalizeBatches(batchResults) {
  return batchResults
    .slice()
    .sort((a, b) => a.batch_id - b.batch_id)
    .map(normalizeBatch);
}
