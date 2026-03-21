import { performance } from "node:perf_hooks";

export class TelemetryRecorder {
  constructor({ logger }) {
    this.logger = logger;
    this.metrics = new Map();
    this.recentTraces = [];
  }

  recordMetric(name, value = 1, tags = {}) {
    if (!name) return;
    const existing = this.metrics.get(name) || { value: 0, tags };
    existing.value += value;
    existing.tags = { ...existing.tags, ...tags };
    this.metrics.set(name, existing);
  }

  startTrace(name, metadata = {}) {
    const start = performance.now();
    const traceMeta = { name, metadata, start, status: "in-progress" };
    return {
      end: (status = "ok", detail = {}) => {
        const duration = Math.max(0, performance.now() - traceMeta.start);
        const finished = {
          name,
          status,
          duration,
          metadata: { ...traceMeta.metadata, ...detail },
          timestamp: new Date().toISOString(),
        };
        this.recentTraces.push(finished);
        if (this.recentTraces.length > 40) {
          this.recentTraces.shift();
        }
        if (this.logger) {
          this.logger.debug("Telemetry trace", { trace: finished });
        }
      },
    };
  }

  snapshot() {
    const metrics = {};
    for (const [name, data] of this.metrics.entries()) {
      metrics[name] = { ...data };
    }
    return {
      metrics,
      recentTraces: [...this.recentTraces],
      timestamp: new Date().toISOString(),
    };
  }
}

export function createTelemetry({ logger }) {
  return new TelemetryRecorder({ logger });
}
