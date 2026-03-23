/**
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */
import crypto from "crypto";

export class PodManager {
  constructor({ eventBus, telemetry, logger }) {
    this.eventBus = eventBus;
    this.telemetry = telemetry;
    this.logger = logger;
    this.pods = new Map();
    this.drones = new Map();
    this.maintenancePodId = null;

    if (this.eventBus) {
      this.eventBus.subscribe("pod:completed", (payload) => {
        this.telemetry?.recordMetric("pod.completed");
        if (payload?.pod) {
          this.logger?.info("Pod completed, rerouting drones", { pod: payload.pod.name });
          this.rerouteDronesToMaintenance(payload.pod.id);
        }
      });
    }
  }

  createPod({ name, project, priority = 5, drones = [], status = "active", labels = [] }) {
    const id = `pod_${crypto.randomUUID().slice(0, 8)}`;
    const pod = {
      id,
      name,
      project,
      priority,
      status,
      labels,
      drones: new Set(),
      history: [],
      createdAt: new Date().toISOString(),
    };
    this.pods.set(id, pod);
    drones.forEach((drone) => this.assignDroneToPod(drone, id));
    this.telemetry?.recordMetric("pod.created", 1, { project, priority });
    this.eventBus?.publish("pod:created", { pod });
    return pod;
  }

  registerDrone({ id, label, skills = [] } = {}) {
    const droneId = id || `drone_${crypto.randomUUID().slice(0, 6)}`;
    if (this.drones.has(droneId)) {
      return this.drones.get(droneId);
    }
    const drone = {
      id: droneId,
      label: label || droneId,
      skills,
      status: "idle",
      podId: null,
      lastSeen: new Date().toISOString(),
    };
    this.drones.set(droneId, drone);
    this.telemetry?.recordMetric("drone.registered");
    return drone;
  }

  assignDroneToPod(droneId, podId) {
    const drone = this.drones.get(droneId);
    const pod = this.pods.get(podId);
    if (!drone || !pod) return null;
    if (drone.podId) {
      const previousPod = this.pods.get(drone.podId);
      previousPod?.drones.delete(droneId);
    }
    pod.drones.add(droneId);
    drone.podId = podId;
    drone.status = "active";
    drone.lastSeen = new Date().toISOString();
    this.telemetry?.recordMetric("drone.assigned", 1, { pod: pod.name });
    this.eventBus?.publish("drone:assigned", { podId, droneId });
    return drone;
  }

  setPodStatus(podId, status, note = "") {
    const pod = this.pods.get(podId);
    if (!pod) return null;
    pod.status = status;
    pod.history.push({ status, note, at: new Date().toISOString() });
    this.eventBus?.publish("pod:status", { podId, status, note });
    return pod;
  }

  markPodComplete(podId, { note = "", nextProject } = {}) {
    const pod = this.pods.get(podId);
    if (!pod) return null;
    pod.status = "completed";
    pod.completedAt = new Date().toISOString();
    pod.history.push({ status: "completed", note, nextProject });
    this.eventBus?.publish("pod:completed", { pod, note, nextProject });
    return pod;
  }

  listPods() {
    const pods = [];
    for (const pod of this.pods.values()) {
      pods.push({
        ...pod,
        drones: Array.from(pod.drones),
      });
    }
    return pods;
  }

  rerouteDronesToMaintenance(sourcePodId) {
    const maintenancePod = this.ensureMaintenancePod();
    for (const drone of this.drones.values()) {
      if (drone.status === "active" && drone.podId === sourcePodId) {
        this.assignDroneToPod(drone.id, maintenancePod.id);
      }
    }
    return maintenancePod;
  }

  moveDronesBetweenPods(sourcePodId, targetPodId, limit = 1) {
    const sourcePod = this.pods.get(sourcePodId);
    const targetPod = this.pods.get(targetPodId);
    if (!sourcePod || !targetPod) return [];
    const moved = [];
    for (const droneId of Array.from(sourcePod.drones)) {
      if (moved.length >= limit) break;
      const drone = this.drones.get(droneId);
      if (!drone) continue;
      this.assignDroneToPod(droneId, targetPodId);
      moved.push(droneId);
    }
    return moved;
  }

  getIdleDrones(limit = 2) {
    const idle = [];
    for (const drone of this.drones.values()) {
      if (drone.status === "idle") {
        idle.push(drone.id);
        if (idle.length >= limit) break;
      }
    }
    return idle;
  }

  ensureMaintenancePod() {
    if (this.maintenancePodId && this.pods.has(this.maintenancePodId)) {
      return this.pods.get(this.maintenancePodId);
    }
    const pod = this.createPod({
      name: "maintenance",
      project: "Platform Maintenance",
      priority: 1,
      status: "maintenance",
      labels: ["core", "maintenance"],
    });
    this.maintenancePodId = pod.id;
    return pod;
  }

  getSummary() {
    return {
      pods: this.listPods(),
      drones: Array.from(this.drones.values()),
      telemetry: this.telemetry?.snapshot?.() || {},
    };
  }
}

export function createPodManager(deps) {
  return new PodManager(deps);
}
