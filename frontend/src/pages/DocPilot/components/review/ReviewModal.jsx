import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

import { useEngine } from "../../hooks/useEngine.js";
import { REPO } from "../../data/constants.js";
import { changesIn, pendingCount } from "../../engine/helpers.js";

import Icon from "../common/Icon.jsx";
import BackgroundStrip from "./BackgroundStrip.jsx";
import FilePager from "./FilePager.jsx";
import HunkDiff from "./HunkDiff.jsx";
import ReviewFooter from "./ReviewFooter.jsx";
import BatchDone from "./BatchDone.jsx";

import "./ReviewModal.css";

/** The review popup: Before/After per file, Documentation Changes, and generated README viewer. */
export default function ReviewModal() {
  const engine = useEngine();
  const { modal } = engine;

  const b = engine.batches[modal.batch];

  const closeRef = useRef(null);
  const bodyRef = useRef(null);

  const [activeTab, setActiveTab] = useState("changes");
  const [copiedReadme, setCopiedReadme] = useState(false);
  const [committingBatch, setCommittingBatch] = useState(false);

  // If a batch has no code files but has a README, switch to the readme tab
  useEffect(() => {
    if (b && (!b.files || b.files.length === 0) && b.readme) {
      setActiveTab("readme");
    } else {
      setActiveTab("changes");
    }
  }, [modal.batch, b?.id]);

  useEffect(() => {
    if (!modal.open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") {
        engine.closeModal();
        return;
      }

      if (activeTab === "changes") {
        if (e.key === "ArrowRight") {
          const currentBatch = engine.batches[engine.modal.batch];
          if (currentBatch && currentBatch.files?.length > 0) {
            engine.gotoPage(currentBatch.page + 1);
          }
          return;
        }

        if (e.key === "ArrowLeft") {
          const currentBatch = engine.batches[engine.modal.batch];
          if (currentBatch && currentBatch.files?.length > 0) {
            engine.gotoPage(currentBatch.page - 1);
          }
        }
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [modal.open, engine, activeTab]);

  useEffect(() => {
    if (modal.open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      closeRef.current?.focus({ preventScroll: true });

      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [modal.open]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [modal.batch, b?.page, activeTab]);

  if (!b) {
    return null;
  }

  const committingNow = Boolean(engine.isBatchCommitting?.(b.id));
  const statusDone = b.status === "done" || b.status === "committed";
  // Real jobs: only the backend's confirmation counts as "done".
  const done = engine.realJob
    ? statusDone
    : statusDone || (b.files && b.files.length > 0 && pendingCount(b) === 0 && b.status !== "generating");
  const file = b.files?.[b.page];
  const totalBatches = engine.totalBatches || REPO.batches;
  const hasFiles = b.files && b.files.length > 0;
  const hasReadme = Boolean(b.readme);

  const pending = pendingCount(b);
  const totalChanges = changesIn(b);

  let reviewStatusLabel = "Ready for review";
  let reviewStatusClass = "ready";

  if (committingNow) {
    reviewStatusLabel = "Committing…";
    reviewStatusClass = "generating";
  }
  else if (done || (!engine.realJob && totalChanges > 0 && pending === 0)) {
    reviewStatusLabel = "Reviewed & Committed";
    reviewStatusClass = "done";
  }
  else if (pending < totalChanges && pending > 0) {
    reviewStatusLabel = "Partially reviewed";
    reviewStatusClass = "partial";
  }
  else if (b.status === "generating") {
    reviewStatusLabel = "Generated";
    reviewStatusClass = "generating";
  }
  else {
    reviewStatusLabel = "Ready for review";
    reviewStatusClass = "ready";
  }

  const handleSelectHunk = (hi) => {

    const el = document.getElementById(`hunk-${b.id}-${b.page}-${hi}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("is-flash");
      setTimeout(() => el.classList.remove("is-flash"), 1200);
    }
  };

  const handleCopyReadme = () => {
    if (!b.readme) return;
    navigator.clipboard.writeText(b.readme);
    setCopiedReadme(true);
    setTimeout(() => setCopiedReadme(false), 2000);
  };

  const handleCommitBatch = async () => {
      if (committingBatch || committingNow) return;

      setCommittingBatch(true);

      try {
        const success = await engine.commitBatch(b);

        if (!success) {
          return;
        }
      } finally {
        setCommittingBatch(false);
      }
    };

  const modalContent = (
    <div
      className={`review-overlay ${modal.open ? "is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
      aria-hidden={!modal.open}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          engine.closeModal();
        }
      }}
    >
      <div className={`review-window modal__card ${done ? "is-done" : ""}`}>
        <div className="modal__head">
          <div className="modal__head-info">
            <div className="modal__title-row">
              <h3 id="review-title">
                Review changes for batch <b>{b.id}</b>{" "}
                <span>of {totalBatches}</span>
              </h3>
              <span className={`chip chip--review-status chip--${reviewStatusClass}`}>
                {reviewStatusLabel}
              </span>
            </div>

            <p>
              {b.files?.length || 0} files, {changesIn(b)} changes,{" "}
              {pendingCount(b)} still to commit.{" "}
              {hasReadme ? "README generated." : "No README generated."}
            </p>
          </div>

          <div className="modal__head-actions">
            {engine.batches.length > 1 && (
              <div className="modal__batch-nav" role="group" aria-label="Switch batch">
                <button
                  type="button"
                  className="btn btn--xs btn--outline"
                  disabled={modal.batch === 0}
                  onClick={() => engine.openModal(modal.batch - 1)}
                  title="Previous batch"
                >
                  ◀ Batch {modal.batch}
                </button>
                <span className="modal__batch-counter">
                  Batch {modal.batch + 1} / {engine.batches.length}
                </span>
                <button
                  type="button"
                  className="btn btn--xs btn--outline"
                  disabled={modal.batch >= engine.batches.length - 1}
                  onClick={() => engine.openModal(modal.batch + 1)}
                  title="Next batch"
                >
                  Batch {modal.batch + 2} ▶
                </button>
              </div>
            )}

            <button
              ref={closeRef}
              className="icon-btn"
              onClick={() => engine.closeModal()}
              aria-label="Minimize review window"
              title="Minimize (Esc). Progress is kept."
            >
              <Icon name="minus" size={16} stroke={2.4} />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        {!done && (
          <div className="modal__tabs">
            <button
              type="button"
              className={`modal__tab ${activeTab === "changes" ? "is-active" : ""}`}
              onClick={() => setActiveTab("changes")}
            >
              <span>Documentation Changes</span>
              <span className="modal__tab-badge">{changesIn(b)}</span>
            </button>

            <button
              type="button"
              className={`modal__tab ${activeTab === "readme" ? "is-active" : ""}`}
              onClick={() => setActiveTab("readme")}
            >
              <span>README</span>
              <span
                className={`modal__tab-badge ${
                  hasReadme ? "modal__tab-badge--success" : ""
                }`}
              >
                {hasReadme ? "Generated" : "None"}
              </span>
            </button>
          </div>
        )}

        <BackgroundStrip />

        {done ? (
          <div
            className="modal__body modal__body--done"
            ref={bodyRef}
          >
            <BatchDone batch={b} />
          </div>
        ) : activeTab === "readme" ? (
          <div className="modal__readme-wrapper" ref={bodyRef}>
            <div className="modal__readme-toolbar">
              <span className="modal__readme-title">
                {hasReadme
                  ? `Generated README.md (Batch #${b.id})`
                  : "Batch README"}
              </span>
              {hasReadme && (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {!done && (
                   <button
                  type="button"
                  className="btn btn--sm btn--accent"
                  onClick={handleCommitBatch}
                  disabled={committingBatch}
                >
                      {committingBatch ? (
                        <>
                          <span className="btn__spinner" aria-hidden="true" />
                          Committing...
                        </>
                      ) : (
                        "Approve & Commit Batch"
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--sm btn--outline"
                    onClick={handleCopyReadme}
                  >
                    {copiedReadme ? "Copied!" : "Copy README Markdown"}
                  </button>
                </div>
              )}
            </div>

            {hasReadme ? (
              <div className="modal__readme-body">
                <pre>{b.readme}</pre>
              </div>
            ) : (
              <div className="modal__empty-state">
                <h4>No README Generated</h4>
                <p>No README was generated for this batch.</p>
                {hasFiles && (
                  <button
                    type="button"
                    className="btn btn--sm btn--accent"
                    onClick={() => setActiveTab("changes")}
                  >
                    View Code Changes ({changesIn(b)})
                  </button>
                )}
                {!hasFiles && !done && (
                  <button
                    type="button"
                    className="btn btn--sm btn--accent"
                    onClick={handleCommitBatch}
                    disabled={committingBatch}
                  >
                    {committingBatch ? "Committing..." : "Approve & Commit Batch"}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {hasFiles ? (
              <>
                {file && (
                  <FilePager
                    batch={b}
                    file={file}
                    onSelectHunk={handleSelectHunk}
                  />
                )}

                <div
                  className={`modal__body ${
                    modal.animate ? "animate" : ""
                  }`}
                  ref={bodyRef}
                >
                  {file?.hunks?.map((_, hi) => (
                    <HunkDiff
                      key={`${b.id}-${b.page}-${hi}`}
                      batch={b}
                      fi={b.page}
                      hi={hi}
                    />
                  ))}
                </div>

                <ReviewFooter batch={b} />
              </>
            ) : (
              <div className="modal__empty-state" ref={bodyRef}>
                <h4>No Code File Changes</h4>
                <p>
                  No source code files required documentation changes in this
                  batch. All generated documentation was compiled into the
                  README.
                </p>
                {hasReadme && (
                  <button
                    type="button"
                    className="btn btn--sm btn--accent"
                    onClick={() => setActiveTab("readme")}
                  >
                    View Generated README
                  </button>
                )}
                {!done && (
                  <button
                    type="button"
                    className="btn btn--sm btn--accent"
                    onClick={handleCommitBatch}
                    disabled={committingBatch}
                  >
                    {committingBatch ? "Committing..." : "Approve & Commit Batch"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
