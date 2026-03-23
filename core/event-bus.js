/**
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */
import { EventEmitter } from "events";

export class EventBus extends EventEmitter {
  publish(eventName, payload = {}) {
    if (!eventName) return;
    this.emit(eventName, payload);
  }

  subscribe(eventName, handler) {
    this.on(eventName, handler);
    return () => this.off(eventName, handler);
  }
}

export function createEventBus() {
  return new EventBus();
}
