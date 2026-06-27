<!-- SYNOPSIS: BuilderOS Missions — HISTORY_SNAPSHOT registry and NOT runtime authority -->

# BuilderOS Missions

**Status:** NOT runtime authority — mission folders are history and build scaffolding, not live product law.

---

## What missions are

Each subfolder is a BuilderOS mission pack:
- `FOUNDER_PACKET.md` — what the founder accepted as the success test
- `BLUEPRINT.json` — the build plan (HOW)
- `CONTENT/` — mission-era code/doc snapshots (**HISTORY_SNAPSHOT** — not live runtime)
- `acceptance/` — acceptance scripts

Mission completion produces a receipt in the owning amendment and the BP_PRIORITY.json sync marker.

---

## Authority boundary

| Path | Is it authority? |
|------|-----------------|
| `MISSIONS/*/FOUNDER_PACKET.md` | Build intent — HISTORY_SNAPSHOT after acceptance |
| `MISSIONS/*/BLUEPRINT.json` | Build plan — HISTORY_SNAPSHOT after acceptance |
| `MISSIONS/*/CONTENT/**` | Snapshots only — NOT runtime authority — use FILE_MANIFEST.json for live paths |
| `MISSIONS/*/acceptance/` | Acceptance scripts — reference only after acceptance |

**CONTENT/ files:** These hold pre-promotion copies of routes/services/etc. that were scoped for a mission. They are **NOT runtime authority**. Live file ownership lives in `docs/products/*/FILE_MANIFEST.json`. A `CONTENT/` file with `@ssot docs/projects/AMENDMENT_*` must include `HISTORY_SNAPSHOT` in its header.

---

## Live product ownership

For live runtime behavior, always go to:
- `docs/products/PRODUCT_REGISTRY.json` — which products exist
- `docs/products/<id>/PRODUCT_HOME.md` — canonical product home
- `docs/products/<id>/FILE_MANIFEST.json` — owned source files

NOT runtime authority and NOT FILE_MANIFEST.json → this README.
