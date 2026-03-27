# policy/ssot-coupling.rego
# OPA policy: enforces that code changes are always paired with amendment updates.
#
# Rules:
#   1. If routes/*.js changed → its linked amendment must also be changed
#   2. If services/*.js changed → its linked amendment must also be changed
#   3. If an amendment changed → its corresponding manifest must also change
#
# Run via: node scripts/check-coupling.mjs
# Or:      conftest test --input <git-diff-json> policy/
#
# @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md

package main

import future.keywords.in

# ── Helpers ───────────────────────────────────────────────────────────────────

# Extract the filename from a path
basename(p) = name {
  parts := split(p, "/")
  name := parts[count(parts) - 1]
}

# Check if any changed file matches a pattern prefix
any_changed_matching(prefix) {
  f := input.changed_files[_]
  startswith(f, prefix)
}

# Check if any changed file matches a suffix
any_changed_with_suffix(suffix) {
  f := input.changed_files[_]
  endswith(f, suffix)
}

# ── Rule 1: Route files require amendment update ──────────────────────────────
deny[msg] {
  f := input.changed_files[_]
  startswith(f, "routes/")
  endswith(f, ".js")

  # Find the ssot tag mapping for this file (passed in input.ssot_map)
  amendment := input.ssot_map[f]

  # Amendment must also appear in changed files
  not amendment in input.changed_files

  msg := sprintf(
    "COUPLING VIOLATION: '%v' changed but its amendment '%v' was not updated. Update the amendment's 'Last Updated' date and add a change receipt.",
    [f, amendment]
  )
}

# ── Rule 2: Service files require amendment update ────────────────────────────
deny[msg] {
  f := input.changed_files[_]
  startswith(f, "services/")
  endswith(f, ".js")

  amendment := input.ssot_map[f]
  not amendment in input.changed_files

  msg := sprintf(
    "COUPLING VIOLATION: '%v' changed but its amendment '%v' was not updated.",
    [f, amendment]
  )
}

# ── Rule 3: Core files require amendment update ───────────────────────────────
deny[msg] {
  f := input.changed_files[_]
  startswith(f, "core/")
  endswith(f, ".js")

  amendment := input.ssot_map[f]
  not amendment in input.changed_files

  msg := sprintf(
    "COUPLING VIOLATION: '%v' changed but its amendment '%v' was not updated.",
    [f, amendment]
  )
}

# ── Rule 4: Amendment change requires manifest update ─────────────────────────
deny[msg] {
  f := input.changed_files[_]
  startswith(f, "docs/projects/AMENDMENT_")
  endswith(f, ".md")

  # Derive expected manifest path
  manifest := replace(f, ".md", ".manifest.json")
  not manifest in input.changed_files

  msg := sprintf(
    "MANIFEST SYNC: Amendment '%v' changed but manifest '%v' was not updated. Keep them in sync.",
    [f, manifest]
  )
}

# ── Warn: files without @ssot tags (non-blocking) ────────────────────────────
warn[msg] {
  f := input.changed_files[_]
  startswith(f, "routes/")
  endswith(f, ".js")
  not input.ssot_map[f]

  msg := sprintf(
    "MISSING @ssot TAG: '%v' has no @ssot tag. Add one pointing to the correct amendment.",
    [f]
  )
}

warn[msg] {
  f := input.changed_files[_]
  startswith(f, "services/")
  endswith(f, ".js")
  not input.ssot_map[f]

  msg := sprintf(
    "MISSING @ssot TAG: '%v' has no @ssot tag.",
    [f]
  )
}
