/**
 * SYNOPSIS: js — tests/operator-runtime-status-freshness.test.js.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { evaluateSnapshotFreshness } from "../scripts/operator-runtime-status.mjs";

test("evaluateSnapshotFreshness marks missing disk snapshot as STALE", () => {
  const fresh = {
    generated_at: new Date().toISOString(),
    COMMIT_SHA: "abc",
    ORIGIN_MAIN_SHA: "abc",
    GIT_SYNC: { behind_origin_main: false, skip_reason: null },
    DRIFT_SEVERITY_HINT: "INFO",
  };
  const result = evaluateSnapshotFreshness({ diskSnapshot: null, freshSnapshot: fresh, staleSec: 300 });
  assert.equal(result.status, "STALE");
  assert.match(result.reasons.join(","), /snapshot_missing_on_disk/);
});

test("evaluateSnapshotFreshness marks conflicting disk snapshot as STALE", () => {
  const fresh = {
    generated_at: new Date().toISOString(),
    COMMIT_SHA: "fresh",
    ORIGIN_MAIN_SHA: "origin-b",
    GIT_SYNC: { behind_origin_main: false, skip_reason: null },
    DRIFT_SEVERITY_HINT: "INFO",
  };
  const disk = {
    generated_at: new Date().toISOString(),
    COMMIT_SHA: "stale",
    ORIGIN_MAIN_SHA: "origin-a",
    GIT_SYNC: { behind_origin_main: false, skip_reason: null },
    DRIFT_SEVERITY_HINT: "INFO",
  };
  const result = evaluateSnapshotFreshness({ diskSnapshot: disk, freshSnapshot: fresh, staleSec: 300 });
  assert.equal(result.status, "STALE");
  assert.ok(result.conflictingFields.includes("COMMIT_SHA"));
  assert.ok(result.conflictingFields.includes("ORIGIN_MAIN_SHA"));
});

test("evaluateSnapshotFreshness marks behind-origin fresh state as FAIL_CLOSED", () => {
  const fresh = {
    generated_at: new Date().toISOString(),
    COMMIT_SHA: "abc",
    ORIGIN_MAIN_SHA: "def",
    GIT_SYNC: { behind_origin_main: true, skip_reason: null },
    DRIFT_SEVERITY_HINT: "FAIL_CLOSED",
  };
  const disk = {
    generated_at: new Date().toISOString(),
    COMMIT_SHA: "abc",
    ORIGIN_MAIN_SHA: "def",
    GIT_SYNC: { behind_origin_main: true, skip_reason: null },
    DRIFT_SEVERITY_HINT: "FAIL_CLOSED",
  };
  const result = evaluateSnapshotFreshness({ diskSnapshot: disk, freshSnapshot: fresh, staleSec: 300 });
  assert.equal(result.status, "FAIL_CLOSED");
});
