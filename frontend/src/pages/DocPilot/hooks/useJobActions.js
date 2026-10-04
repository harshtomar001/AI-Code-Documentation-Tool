import { useCallback, useMemo } from "react";
import { jobStore } from "../store/jobStore.js";
import { realJobController } from "../controllers/realJobController.js";
import { demoController } from "../controllers/demoController.js";
import { commitBatch, commitAll } from "../services/commitService.js";
import { downloadJobArchive } from "../../../api/jobs.js";
import { getToken } from "../../../utils/getToken.js"
import { pendingHunks, pendingCount, shortPath } from "../engine/helpers.js";

/**
 * Hook providing all action dispatchers for DocPilot.
 * Stable references that do not cause re-renders.
 */
export function useJobActions() {
  const openModal = useCallback((batchIdx) => {
    const state = jobStore.getState();
    const batch = state.batches[batchIdx];

    jobStore.setState((s) => ({
      modal: { open: true, batch: batchIdx, animate: true, tab: "changes" },
      confirmRepo: false,
      toasts: s.toasts.filter((t) => t.kind !== "ready"),
    }));

    if (state.realJob && state.jobId && batch) {
      realJobController.fetchBatchDetail(batch.id, getToken());
    }
  }, []);

  const closeModal = useCallback(() => {
    jobStore.setState((s) => ({
      modal: { ...s.modal, open: false },
    }));
  }, []);

  const switchBatch = useCallback((batchIdx) => {
    const state = jobStore.getState();
    const batch = state.batches[batchIdx];

    jobStore.setState((s) => ({
      modal: { ...s.modal, batch: batchIdx, animate: true },
      confirmRepo: false,
      flash: null,
    }));

    if (state.realJob && state.jobId && batch) {
      realJobController.fetchBatchDetail(batch.id, getToken());
    }
  }, []);

  const gotoPage = useCallback((p) => {
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
  }, []);

  const handleBatchDone = useCallback((b) => {
    const state = jobStore.getState();
    if (b.status === "done" || b.status === "committed") return;
    if (pendingCount(b) > 0) return;

    if (state.realJob && state.jobId) {
      commitBatch(state.jobId, b, getToken());
    } else {
      demoController.checkBatchDone(b);
    }
  }, []);

  const commitHunkAction = useCallback(
    (b, fi, hi) => {
      const state = jobStore.getState();
      const f = b.files?.[fi];
      const h = f?.hunks?.[hi];
      if (!h || h.status !== "pending") return;

      if (!state.realJob) {
        demoController.commitHunk(b, fi, hi);
        return;
      }

      // Real jobs: approving a change stages it locally; backend commits per batch
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
                  hunkIdx === hi ? { ...hunk, status: "committed", sha: null } : hunk
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

      const updatedBatch = jobStore.getState().batches.find((item) => item.id === b.id);
      if (updatedBatch) {
        handleBatchDone(updatedBatch);
      }
    },
    [handleBatchDone]
  );

  const skipHunkAction = useCallback(
    (b, fi, hi) => {
      const state = jobStore.getState();
      const h = b.files?.[fi]?.hunks?.[hi];
      if (!h || h.status !== "pending") return;

      if (!state.realJob) {
        demoController.skipHunk(b, fi, hi);
        return;
      }

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

      const updatedBatch = jobStore.getState().batches.find((item) => item.id === b.id);
      if (updatedBatch) {
        handleBatchDone(updatedBatch);
      }
    },
    [handleBatchDone]
  );

  const unskipHunkAction = useCallback((b, fi, hi) => {
    const state = jobStore.getState();
    const h = b.files?.[fi]?.hunks?.[hi];
    if (!h || h.status !== "skipped") return;

    if (!state.realJob) {
      demoController.unskipHunk(b, fi, hi);
      return;
    }

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
  }, []);

  const commitFileAction = useCallback(
    (b, fi) => {
      const state = jobStore.getState();
      const f = b.files?.[fi];
      if (!f) return;
      const list = pendingHunks(f);
      if (!list.length) return;

      if (!state.realJob) {
        demoController.commitFile(b, fi);
        return;
      }

      jobStore.setState((s) => {
        const nextBatches = s.batches.map((item) => {
          if (item.id !== b.id) return item;
          return {
            ...item,
            files: item.files.map((file, fileIdx) => {
              if (fileIdx !== fi) return file;
              return {
                ...file,
                hunks: file.hunks.map((hunk) => ({ ...hunk, status: "committed", sha: null })),
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

      const updatedBatch = jobStore.getState().batches.find((item) => item.id === b.id);
      if (updatedBatch) {
        handleBatchDone(updatedBatch);
      }

      const nx = b.files.findIndex((ff, i) => i > fi && pendingHunks(ff).length);
      if (nx >= 0 && b.status !== "done") {
        setTimeout(() => {
          const cur = jobStore.getState();
          if (cur.modal.open && cur.batches[cur.modal.batch]?.id === b.id) {
            gotoPage(nx);
          }
        }, 650);
      }
    },
    [gotoPage, handleBatchDone]
  );

  const commitBatchAction = useCallback(async (b) => {
    let target = b;
    const state = jobStore.getState();
    if (typeof target === "number" || (typeof target === "string" && !isNaN(target))) {
      const num = Number(target);
      target = state.batches.find((x) => x.id === num) || state.batches[num];
    }
    if (!target) return false;

    if (state.realJob && state.jobId) {
      return commitBatch(state.jobId, target, getToken());
    }
    return demoController.commitBatch(target);
  }, []);

  const commitRepoAction = useCallback(async () => {
    const state = jobStore.getState();
    if (state.realJob && state.jobId) {
      return commitAll(state.jobId, state.batches, state.repositoryName || "repository", getToken());
    }
    return demoController.commitRepo();
  }, []);

  const requestCommitRepoAction = useCallback(() => {
    const state = jobStore.getState();
    if (!state.confirmRepo) {
      jobStore.setState({ confirmRepo: true });
      setTimeout(() => {
        if (jobStore.getState().confirmRepo) {
          jobStore.setState({ confirmRepo: false });
        }
      }, 4000);
    } else {
      commitRepoAction();
    }
  }, [commitRepoAction]);

  const setAutoCommitAction = useCallback((on) => {
    const state = jobStore.getState();
    jobStore.setState({ autoCommit: on });
    if (!on) {
      jobStore.setState((s) => ({
        toasts: [
          {
            id: Date.now(),
            kind: "info",
            title: "Auto-commit is off",
            text: "New batches will wait for your review again.",
          },
          ...s.toasts.slice(0, 5),
        ],
      }));
    } else if (state.realJob) {
      realJobController.autoCommitArrivals();
    }
  }, []);

  const dismissToastAction = useCallback((id) => {
    jobStore.setState((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    }));
  }, []);

  const downloadZipAction = useCallback(async () => {
    const state = jobStore.getState();
    if (!state.jobId) return;

    jobStore.setState((s) => ({
      toasts: [
        {
          id: Date.now(),
          kind: "info",
          title: "Preparing download",
          text: "Packaging documented repository...",
        },
        ...s.toasts.slice(0, 5),
      ],
    }));

    try {
      await downloadJobArchive(
        state.jobId,
        getToken(),
        state.repositoryName || "repository"
      );
      jobStore.setState((s) => ({
        toasts: [
          {
            id: Date.now(),
            kind: "ok",
            title: "Download started",
            text: "Your documented repository ZIP has been generated.",
          },
          ...s.toasts.slice(0, 5),
        ],
      }));
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        "Failed to download repository archive";
      jobStore.setState((s) => ({
        toasts: [
          {
            id: Date.now(),
            kind: "warn",
            title: "Download failed",
            text: msg,
          },
          ...s.toasts.slice(0, 5),
        ],
      }));
    }
  }, []);

  const restartAction = useCallback(
    (onUrlUpdate = null) => {
      const state = jobStore.getState();
      if (state.realJob) {
        if (state.projectId) {
          realJobController.restart(
            state.projectId,
            state.repositoryName || "repository",
            getToken(),
            onUrlUpdate
          );
        }
      } else {
        demoController.restart();
      }
    },
    []
  );

  const setOptAction = useCallback((key, value) => {
    demoController.setOpt(key, value);
  }, []);

  return useMemo(
    () => ({
      openModal,
      closeModal,
      switchBatch,
      gotoPage,
      commitHunk: commitHunkAction,
      skipHunk: skipHunkAction,
      unskipHunk: unskipHunkAction,
      commitFile: commitFileAction,
      commitBatch: commitBatchAction,
      commitRepo: commitRepoAction,
      requestCommitRepo: requestCommitRepoAction,
      setAutoCommit: setAutoCommitAction,
      dismissToast: dismissToastAction,
      downloadZip: downloadZipAction,
      restart: restartAction,
      setOpt: setOptAction,
      startProjectJob: (projectId, repoName, token, onUrlUpdate) =>
        realJobController.startJob(projectId, repoName, token, onUrlUpdate),
      loadExistingJob: (projectId, jobId, token, repoName) =>
        realJobController.loadExistingJob(projectId, jobId, token, repoName),
      stop: () => {
        realJobController.stop();
        demoController.stop();
      },
    }),
    [
      openModal,
      closeModal,
      switchBatch,
      gotoPage,
      commitHunkAction,
      skipHunkAction,
      unskipHunkAction,
      commitFileAction,
      commitBatchAction,
      commitRepoAction,
      requestCommitRepoAction,
      setAutoCommitAction,
      dismissToastAction,
      downloadZipAction,
      restartAction,
      setOptAction,
    ]
  );
}
