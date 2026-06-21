#!/usr/bin/env bash
# SYNOPSIS: Shell script — Compare Run Directories.
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <dir-a> <dir-b> [dir-c ...]" >&2
  exit 1
fi

base="$1"
shift

if [ ! -d "$base" ]; then
  echo "missing directory: $base" >&2
  exit 1
fi

hash_dir() {
  local dir="$1"
  (
    cd "$dir"
    find . -type f ! -name '.DS_Store' -print0 \
      | sort -z \
      | xargs -0 shasum -a 256
  )
}

base_hash="$(mktemp)"
hash_dir "$base" > "$base_hash"

echo "BASE: $base"

for other in "$@"; do
  if [ ! -d "$other" ]; then
    echo "missing directory: $other" >&2
    rm -f "$base_hash"
    exit 1
  fi

  other_hash="$(mktemp)"
  hash_dir "$other" > "$other_hash"

  echo "COMPARE: $base <-> $other"
  if diff -u "$base_hash" "$other_hash"; then
    echo "MATCH: $other"
  else
    echo "DIFF: $other"
    rm -f "$base_hash" "$other_hash"
    exit 2
  fi

  rm -f "$other_hash"
done

rm -f "$base_hash"
echo "ALL RUNS MATCH"
