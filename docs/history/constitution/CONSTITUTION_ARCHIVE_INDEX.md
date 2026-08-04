<!-- SYNOPSIS: Index of constitution files archived because they claimed improper authority AND were redundant. Founder-authorized convention (2026-08-03). Not itself constitutional authority. -->

# Constitution Archive Index

**Convention (founder-authorized 2026-08-03):** When a file under `docs/constitution/` (a) claims constitutional/SUPREME/RATIFIED authority it does not actually hold **AND** (b) its content is already covered elsewhere / not worth keeping, it is `git mv`'d into `docs/history/constitution/` — with **no** forwarding stub, shim, or redirect — so anything depending on the old path breaks loudly and the hidden dependency becomes visible. Files that claim improper authority but hold unique content are NOT archived; they are recorded as authority findings for founder resolution.

> **Location note (important):** The founder's instruction named `docs/constitution/archive/`, but that path is **gitignored** (`.gitignore:25` — `archive/`). Archiving there would silently *untrack* the moved file instead of preserving history — the opposite of the intent. This repo's real, tracked archive convention is **`docs/history/constitution/`** (where the existing constitution redirect stubs already point). The convention is therefore seeded here, not under the gitignored path. See finding F-16.

This directory is **not** a source of constitutional authority. The only canonical constitution is `docs/constitution/NORTH_STAR_SSOT.md`.

## Archived by the archive convention

| Date | File (old path) | Reason | What broke as a result |
|---|---|---|---|
| — | *(none yet)* | — | — |

## Audit note — 2026-08-03 (independent constitutional audit)
Archive candidates were vetted against the two-part bar. **No file qualified** (see `docs/reports/HIDDEN_DEPENDENCY_AUDIT_2026-08-03.md`):
- `CONSTITUTIONAL_FRAMEWORK.md` — improperly claims "RATIFIED" (no record; derives from unratified §2.0M) but is **load-bearing** (NORTH_STAR_SSOT §2.0M, REGISTRY.json, ENFORCEMENT_MATRIX.json, and three scripts depend on it) → recorded as finding **F-13**, not archived.
- `NORTH_STAR.md`, `CONSTITUTION_CONFLICTS.md`, `CONSTITUTION_INVENTORY.md`, `CONSTITUTION_MAPPING.md` — redundant/retired but already correctly self-disclaim authority (they are the redirect stubs that point *into this very directory*) → left as-is.

The convention is seeded for future use once the founder resolves the F-01/F-13 authority questions.
