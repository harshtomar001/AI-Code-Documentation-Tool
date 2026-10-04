import { fetchJob, fetchJobBatches } from "../api/docPilotJobs.js";

/**
 * JobPoller handles periodic polling fallback for job and batch status.
 *
 * Guarantees:
 * - Polls every 2.5s while job is running.
 * - Stops when job completes or fails.
 * - Cancels stale async responses via sequence IDs.
 * - Safe against React StrictMode mount/unmount races.
 */
export class JobPoller {
  constructor() {
    this._timer = null;
    this._seq = 0;
    this._active = false;
    this._jobId = null;
    this._token = null;
    this._onUpdate = null;
    this._onError = null;
    this._intervalMs = 2500;
  }

  /**
   * Start polling for a job.
   *
   * @param {Object} options
   * @param {string} options.jobId
   * @param {string|null} [options.token]
   * @param {(data: { job: any, batches: any[] }) => void} options.onUpdate
   * @param {(error: any) => void} [options.onError]
   * @param {number} [options.intervalMs]
   */
  start({ jobId, token = null, onUpdate, onError = null, intervalMs = 2500 }) {
    this.stop();

    if (!jobId) return;

    this._active = true;
    this._jobId = jobId;
    this._token = token;
    this._onUpdate = onUpdate;
    this._onError = onError;
    this._intervalMs = intervalMs;

    this._scheduleNext(0);
  }

  /**
   * Stop polling and discard any in-flight requests.
   */
  stop() {
    this._active = false;
    this._seq++;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * Trigger an immediate poll.
   */
  pollNow() {
    if (!this._active || !this._jobId) return;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._poll();
  }

  _scheduleNext(delay = this._intervalMs) {
    if (!this._active) return;
    if (this._timer) {
      clearTimeout(this._timer);
    }
    this._timer = setTimeout(() => {
      this._poll();
    }, delay);
  }

  async _poll() {
    if (!this._active || !this._jobId) return;

    const seq = ++this._seq;
    const currentJobId = this._jobId;
    const token = this._token;

    try {
      const [job, batches] = await Promise.all([
        fetchJob(currentJobId, token),
        fetchJobBatches(currentJobId, token).catch(() => []),
      ]);

      // If a newer poll started or poller was stopped, discard stale response
      if (!this._active || seq !== this._seq || currentJobId !== this._jobId) {
        return;
      }

      if (job.status === "completed" || job.status === "failed") {
        this.stop();
      }

      this._onUpdate?.({ job, batches });

      if (this._active && job.status !== "completed" && job.status !== "failed") {
        this._scheduleNext(this._intervalMs);
      }
    } catch (err) {
      if (!this._active || seq !== this._seq || currentJobId !== this._jobId) {
        return;
      }

      this._onError?.(err);

      if (this._active) {
        this._scheduleNext(this._intervalMs);
      }
    }
  }
}
