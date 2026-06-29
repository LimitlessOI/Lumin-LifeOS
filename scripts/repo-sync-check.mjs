#!/usr/bin/env node
/**
 * SYNOPSIS: Fails closed when local `main` is behind `origin/main` (fragmented operational reality).
 * Fails closed when local `main` is behind `origin/main` (fragmented operational reality).
 * Run after `git fetch` in CI or before long audits/daemons.
 *
 * Exit: 0 — in sync with origin/main (or ahead), or not on main / no origin
 *        1 — behind origin/main (needs `git pull --ff-only origin main` or merge)
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { getGitOriginAlignment } from "./lib/git-origin-alignment.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function main() {
  const align = getGitOriginAlignment(ROOT);

  if (!align.remoteHead) {
    console.log(
      "[TSOS-MACHINE] THINK: STATE=DEGRADED_VERB=SKIP | repo:sync-check | no origin/main ref — fetch or add remote | NEXT=git fetch origin",
    );
    process.exit(0);
  }

  if (align.branch !== "main") {
    console.log(
      `[TSOS-MACHINE] KNOW: STATE=PASS VERB=SKIP | repo:sync-check | branch=${align.branch} not main | NEXT=n/a`,
    );
    process.exit(0);
  }

  if (align.behindOriginMain === true) {
    console.log(
      `[TSOS-MACHINE] KNOW: STATE=FAIL VERB=HALT_REQUEST | repo:sync-check | main behind origin/main | HEAD=${align.head.slice(0, 7)} origin/main=${align.remoteHead.slice(0, 7)} | NEXT=git pull --ff-only origin main`,
    );
    process.exit(1);
  }

  console.log(
    `[TSOS-MACHINE] KNOW: STATE=PASS VERB=PROBE | repo:sync-check | main aligned with origin/main | HEAD=${align.head.slice(0, 7)}`,
  );
  process.exit(0);
}

main();
