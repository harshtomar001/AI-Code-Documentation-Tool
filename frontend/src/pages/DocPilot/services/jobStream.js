import { createJobEventSource } from "../../../api/jobs.js";

const HANDLED_STAGES = [
  "upload",
  "server",
  "scan",
  "ast",
  "security",
  "secret",
  "redaction",
  "secure",
  "batching",
  "batch",
  "generation",
  "gen",
  "job",
  "commit",
  "ready",
  "done",
];

/**
 * JobStream manages the SSE connection to /api/jobs/{jobId}/events.
 *
 * Features:
 * - Auto-reconnect with exponential backoff.
 * - Last-Event-ID tracking.
 * - 20s watchdog timer that alerts the caller if no event or ping arrives.
 * - Safe against React StrictMode duplicate connections.
 */
export class JobStream {
  /**
   * @param {Object} options
   * @param {string} options.jobId
   * @param {(data: { eventType: string, payload: any, eventId: string }) => void} options.onEvent
   * @param {() => void} [options.onOpen]
   * @param {(error: any) => void} [options.onError]
   * @param {() => void} [options.onWatchdogTimeout]
   */
  constructor({ jobId, onEvent, onOpen = null, onError = null, onWatchdogTimeout = null }) {
    this.jobId = jobId;
    this.onEvent = onEvent;
    this.onOpen = onOpen;
    this.onError = onError;
    this.onWatchdogTimeout = onWatchdogTimeout;

    this.es = null;
    this.lastEventId = null;
    this._active = false;
    this._backoffMs = 1000;
    this._reconnectTimer = null;
    this._watchdogTimer = null;
  }

  /**
   * Start the SSE connection and watchdog.
   */
  start() {
    this.stop();
    this._active = true;
    this._backoffMs = 1000;
    this._connect();
  }

  /**
   * Stop the SSE connection, clear all timers and watchdog.
   */
  stop() {
    this._active = false;

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    if (this._watchdogTimer) {
      clearTimeout(this._watchdogTimer);
      this._watchdogTimer = null;
    }

    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }

  _connect() {
    if (!this._active || !this.jobId) return;

    try {
      this.es = createJobEventSource(this.jobId);
    } catch (err) {
      console.error("[JobStream] Failed to instantiate EventSource:", err);
      this._scheduleReconnect();
      return;
    }

    this._resetWatchdog();

    this.es.onopen = () => {
      if (!this._active) return;
      this._backoffMs = 1000;
      this._resetWatchdog();
      this.onOpen?.();
    };

    this.es.onerror = (err) => {
      if (!this._active) return;
      this.onError?.(err);

      // EventSource closes on connection failure
      if (this.es && this.es.readyState === 2) {
        this._scheduleReconnect();
      }
    };

    // Generic messages and comment keep-alive / pings
    this.es.onmessage = (event) => {
      this._handleRawEvent("message", event);
    };

    // Named stage events
    for (const stage of HANDLED_STAGES) {
      this.es.addEventListener(stage, (event) => {
        this._handleRawEvent(stage, event);
      });
    }
  }

  _handleRawEvent(eventType, event) {
    if (!this._active) return;
    this._resetWatchdog();

    if (event.lastEventId) {
      this.lastEventId = event.lastEventId;
    }

    let payload = event.data;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        // Keep string if not valid JSON
      }
    }

    if (payload?.event_id) {
      this.lastEventId = payload.event_id;
    }

    const eventId =
      this.lastEventId ||
      payload?.event_id ||
      `${this.jobId}-${eventType}-${Date.now()}`;

    this.onEvent?.({
      eventType,
      payload,
      eventId,
    });
  }

  _resetWatchdog() {
    if (this._watchdogTimer) {
      clearTimeout(this._watchdogTimer);
    }
    if (!this._active) return;

    this._watchdogTimer = setTimeout(() => {
      if (this._active) {
        console.warn(`[JobStream] 20s watchdog: no events/pings received for job ${this.jobId}`);
        this.onWatchdogTimeout?.();
      }
    }, 20000);
  }

  _scheduleReconnect() {
    if (!this._active) return;

    if (this.es) {
      this.es.close();
      this.es = null;
    }

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }

    const delay = this._backoffMs;
    this._backoffMs = Math.min(this._backoffMs * 2, 16000);

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._active) {
        console.log(`[JobStream] Reconnecting to job ${this.jobId}...`);
        this._connect();
      }
    }, delay);
  }
}
