import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

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

/** The review popup: Before/After per file, 10 pages per batch, commit buttons at three levels. */
export default function ReviewModal() {
  const engine = useEngine();
  const { modal } = engine;

  const b = engine.batches[modal.batch];

  const closeRef = useRef(null);
  const bodyRef = useRef(null);

  /*
   * IMPORTANT:
   * All hooks must run on every render.
   * Do not return early before these effects.
   */

  useEffect(() => {
    if (!modal.open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") {
        engine.closeModal();
        return;
      }

      if (e.key === "ArrowRight") {
        const currentBatch = engine.batches[engine.modal.batch];

        if (currentBatch) {
          engine.gotoPage(currentBatch.page + 1);
        }

        return;
      }

      if (e.key === "ArrowLeft") {
        const currentBatch = engine.batches[engine.modal.batch];

        if (currentBatch) {
          engine.gotoPage(currentBatch.page - 1);
        }
      }
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [modal.open, engine]);

  useEffect(() => {
    if (modal.open) {
      closeRef.current?.focus({ preventScroll: true });
    }
  }, [modal.open]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [modal.batch, b?.page]);

  /*
   * The batch may not exist on the first render while the real backend
   * job is still starting. That is fine; hooks have already executed.
   */
  if (!b) {
    return null;
  }

  const done = b.status === "done";
  const file = b.files[b.page];

  if (!file && !done) {
    return null;
  }

  const modalContent = (
    <div
      className={`modal ${modal.open ? "is-open" : ""}`}
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
      <div className={`modal__card ${done ? "is-done" : ""}`}>
        <div className="modal__head">
          <div>
            <h3 id="review-title">
              Review changes for batch <b>{b.id}</b>{" "}
              <span>of {REPO.batches}</span>
            </h3>

            <p>
              {b.files.length} files, {changesIn(b)} changes,{" "}
              {pendingCount(b)} still to commit. Nothing reaches your
              repository until you commit it.
            </p>
          </div>

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

        <BackgroundStrip />

        {done ? (
          <div
            className="modal__body modal__body--done"
            ref={bodyRef}
          >
            <BatchDone batch={b} />
          </div>
        ) : (
          <>
            <FilePager batch={b} file={file} />

            <div
              className={`modal__body ${
                modal.animate ? "animate" : ""
              }`}
              ref={bodyRef}
            >
              {file.hunks.map((_, hi) => (
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
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
