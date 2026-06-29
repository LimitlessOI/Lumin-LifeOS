/**
 * SYNOPSIS: Shared git alignment: local HEAD vs `origin/main` (fast-forward behind detection).
 * Shared git alignment: local HEAD vs `origin/main` (fast-forward behind detection).
 *
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import { execSync } from "node:child_process";

function sh(cwd, cmd) {
  return execSync(cmd, { cwd, encoding: "utf8" }).trim();
}

/**
 * @param {string} root - repo root
 * @returns {{
 *   branch: string,
 *   head: string,
 *   remoteHead: string | null,
 *   behindOriginMain: boolean | null,
 *   skipReason: string | null,
 * }}
 */
export function getGitOriginAlignment(root) {
  const branch = sh(root, "git rev-parse --abbrev-ref HEAD");
  const head = sh(root, "git rev-parse HEAD");
  let remoteHead = null;
  try {
    remoteHead = sh(root, "git rev-parse refs/remotes/origin/main");
  } catch {
    return {
      branch,
      head,
      remoteHead: null,
      behindOriginMain: null,
      skipReason: "no_origin_main_ref",
    };
  }

  if (branch !== "main") {
    return {
      branch,
      head,
      remoteHead,
      behindOriginMain: null,
      skipReason: "not_on_main",
    };
  }

  const mergeBase = sh(root, `git merge-base HEAD ${remoteHead}`);
  const behind = mergeBase === head && head !== remoteHead;

  return {
    branch,
    head,
    remoteHead,
    behindOriginMain: behind,
    skipReason: null,
  };
}
