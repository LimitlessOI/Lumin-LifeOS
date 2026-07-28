/**
 * SYNOPSIS: Resolve the file content git would commit (index blob, not dirty worktree) for governance gates.
 * @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Files whose worktree bytes differ from the staged/committed blob. These are the
 * ONLY paths where reading the worktree gives a different answer than reading what
 * git would commit, so they are the only paths that need the slower per-file read.
 */
export function gitUnstagedPaths(root) {
  try {
    const out = execFileSync('git', ['diff', '--name-only'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return new Set(out.trim().split('\n').filter(Boolean));
  } catch {
    return new Set();
  }
}

/** Content of `rel` as staged in the git index (`:path`), or null if unreadable. */
export function readGitIndexContent(root, rel) {
  try {
    return execFileSync('git', ['show', `:${rel}`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

/**
 * Resolve the bytes/content a commit of `rel` would contain.
 *
 * Why this exists: the synopsis index records `bytes` as its freshness signal and
 * the verifier compares that number against the file. If the indexer records DIRTY
 * WORKTREE bytes for a file it never commits, the local verifier agrees with itself
 * and passes while CI — which only ever sees committed content — fails INDEX_STALE.
 * That made the gate pass locally and fail in CI, i.e. a gate that lies. Both sides
 * now resolve through here so local and CI compare the same evidence.
 *
 * Returns null when the path has no readable committed or on-disk content.
 */
export function resolveCommittedFile(root, rel, unstagedSet, { maxBytes = Infinity } = {}) {
  const abs = path.join(root, rel);

  if (unstagedSet?.has(rel)) {
    const content = readGitIndexContent(root, rel);
    if (content !== null) {
      const size = Buffer.byteLength(content, 'utf8');
      let mtime = new Date(0);
      try {
        mtime = fs.statSync(abs).mtime;
      } catch {
        // worktree copy may be deleted while the blob is still staged
      }
      return {
        content: size > maxBytes ? null : content,
        size,
        mtime,
        source: 'git-index',
      };
    }
  }

  let stat;
  try {
    stat = fs.statSync(abs);
  } catch {
    return null;
  }

  if (stat.size > maxBytes) {
    return { content: null, size: stat.size, mtime: stat.mtime, source: 'worktree-oversize' };
  }

  try {
    return {
      content: fs.readFileSync(abs, 'utf8'),
      size: stat.size,
      mtime: stat.mtime,
      source: 'worktree',
    };
  } catch {
    return null;
  }
}
