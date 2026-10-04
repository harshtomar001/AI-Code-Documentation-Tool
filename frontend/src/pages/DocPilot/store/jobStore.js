import { useSyncExternalStore, useCallback, useRef } from "react";
import { STEP_DEFS } from "../data/constants.js";

/**
 * @typedef {'pending' | 'active' | 'done' | 'alert' | 'skipped'} StepState
 *
 * @typedef {Object} StepInfo
 * @property {StepState} state
 * @property {string} detail
 * @property {number} pct
 * @property {number|null} t0
 * @property {number|null} t1
 * @property {string[]} lines
 *
 * @typedef {Object} JobEventItem
 * @property {string} id
 * @property {string} time
 * @property {string} kind
 * @property {string} msg
 * @property {string} [source]
 *
 * @typedef {Object} JobCommitItem
 * @property {string} id
 * @property {string} sha
 * @property {string} msg
 * @property {number} n
 * @property {number[]} [batchIds]
 * @property {number|null} [at]
 * @property {string} [source]
 *
 * @typedef {Object} JobToastItem
 * @property {number} id
 * @property {string} kind
 * @property {string} title
 * @property {string} text
 * @property {number} [ts]
 * @property {number[]} [batches]
 * @property {{ label: string, batch: number }} [action]
 *
 * @typedef {Object} JobModalState
 * @property {boolean} open
 * @property {number} batch
 * @property {boolean} animate
 * @property {string} [tab]
 *
 * @typedef {Object} JobState
 * @property {string|null} jobId
 * @property {string|null} projectId
 * @property {string|null} repositoryName
 * @property {string|null} status - 'starting' | 'running' | 'completed' | 'failed' | 'loading' | null
 * @property {string|null} jobError
 * @property {any[]} batches
 * @property {JobEventItem[]} events
 * @property {Record<string, StepInfo>} steps
 * @property {JobCommitItem[]} commits
 * @property {JobToastItem[]} toasts
 * @property {number} totalBatches
 * @property {string} aside
 * @property {boolean} realJob
 * @property {boolean} generating
 * @property {boolean} finished
 * @property {boolean} autoCommit
 * @property {boolean} confirmRepo
 * @property {number} commitCount
 * @property {Set<string|number>} committingBatchIds
 * @property {Set<string|number>} committedBatchIds
 * @property {JobModalState} modal
 * @property {any|null} flash
 * @property {string|null} notice
 * @property {number} workers
 * @property {{ speed: number, paused: boolean, autopilot: boolean, secrets: boolean }} opts
 */

/**
 * Creates the initial step objects dictionary based on STEP_DEFS.
 * @returns {Record<string, StepInfo>}
 */
export function createInitialSteps() {
  return Object.fromEntries(
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
    ])
  );
}

/**
 * Creates a fresh initial JobState object.
 * @param {Partial<JobState>} [overrides]
 * @returns {JobState}
 */
export function createInitialJobState(overrides = {}) {
  return {
    jobId: null,
    projectId: null,
    repositoryName: null,
    status: null,
    jobError: null,
    batches: [],
    events: [],
    steps: createInitialSteps(),
    commits: [],
    toasts: [],
    totalBatches: 0,
    aside: "Waiting for upload",
    realJob: false,
    generating: false,
    finished: false,
    autoCommit: false,
    confirmRepo: false,
    commitCount: 0,
    committingBatchIds: new Set(),
    committedBatchIds: new Set(),
    modal: {
      open: false,
      batch: 0,
      animate: false,
      tab: "changes",
    },
    flash: null,
    notice: null,
    workers: 6,
    opts: { speed: 1, paused: false, autopilot: false, secrets: true },
    ...overrides,
  };
}

class JobStore {
  constructor() {
    /** @type {JobState} */
    this._state = createInitialJobState();
    /** @type {Set<() => void>} */
    this._listeners = new Set();
  }

  /**
   * Get current state snapshot.
   * @returns {JobState}
   */
  getState = () => {
    return this._state;
  };

  /**
   * Alias for useSyncExternalStore snapshot getter.
   * @returns {JobState}
   */
  getSnapshot = () => {
    return this._state;
  };

  /**
   * Subscribe to store changes.
   * @param {() => void} listener
   * @returns {() => void} Unsubscribe function.
   */
  subscribe = (listener) => {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  };

  /**
   * Update store state immutably.
   * @param {Partial<JobState> | ((prevState: JobState) => Partial<JobState>)} updater
   */
  setState = (updater) => {
    const patch = typeof updater === "function" ? updater(this._state) : updater;
    if (!patch) return;

    const nextState = {
      ...this._state,
      ...patch,
    };

    this._state = nextState;
    this._notify();
  };

  /**
   * Reset store to initial state with optional overrides.
   * @param {Partial<JobState>} [overrides]
   */
  reset = (overrides = {}) => {
    this._state = createInitialJobState(overrides);
    this._notify();
  };

  _notify() {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch (err) {
        console.error("[jobStore] listener error:", err);
      }
    }
  }
}

export const jobStore = new JobStore();

/**
 * Custom selector hook to read slices of jobStore state.
 * Re-renders only when the selector output changes.
 *
 * @template T
 * @param {(state: JobState) => T} selector
 * @param {(a: T, b: T) => boolean} [equalityFn]
 * @returns {T}
 */
export function useJobSelector(selector, equalityFn = Object.is) {
  const lastSelectedRef = useRef(null);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const equalityFnRef = useRef(equalityFn);
  equalityFnRef.current = equalityFn;

  const getSelection = useCallback(() => {
    const nextSelected = selectorRef.current(jobStore.getState());
    if (
      lastSelectedRef.current !== null &&
      equalityFnRef.current(lastSelectedRef.current.value, nextSelected)
    ) {
      return lastSelectedRef.current.value;
    }
    lastSelectedRef.current = { value: nextSelected };
    return nextSelected;
  }, []);

  return useSyncExternalStore(jobStore.subscribe, getSelection, getSelection);
}
