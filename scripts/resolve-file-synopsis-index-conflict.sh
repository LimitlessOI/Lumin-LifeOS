#!/usr/bin/env bash
# SYNOPSIS: Resolve a merge/rebase conflict on the auto-generated
#   builderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json by regenerating
#   it fresh, instead of text-merging.
# @ssot docs/products/zero-drift-handoff-protocol/PRODUCT_HOME.md
#
# Why this exists instead of a `.gitattributes: merge=union` entry:
# the index has a `generated_at` timestamp and a `file_count` header that
# differ on every regeneration. A line-based union merge keeps BOTH
# conflicting values as duplicate top-level JSON keys — which most JSON
# parsers silently resolve by taking the last duplicate, but is corrupt,
# fragile, and depends on parser behavior. This file is fully
# machine-regeneratable, so the correct fix on conflict is: take either
# side (content is superseded either way), regenerate, re-add.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INDEX_PATH="builderos-reboot/governance/REPO_FILE_SYNOPSIS_INDEX.json"

cd "$REPO_ROOT"

if [ -n "$(git status --porcelain "$INDEX_PATH" | grep '^UU')" ] || git diff --name-only --diff-filter=U | grep -qx "$INDEX_PATH"; then
  echo "Resolving conflicted $INDEX_PATH by regenerating..."
  git checkout --theirs "$INDEX_PATH" 2>/dev/null || git checkout --ours "$INDEX_PATH"
else
  echo "No conflict detected on $INDEX_PATH — regenerating anyway to sync."
fi

node scripts/generate-file-synopsis-index.mjs
git add "$INDEX_PATH"
echo "Done. $INDEX_PATH regenerated and staged."
