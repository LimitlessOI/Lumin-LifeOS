<!-- SYNOPSIS: Canonical vs historical authority — cold-agent law -->

# Authority Boundaries

**Status:** CANONICAL — read before mixing product truth with history.

---

## Active product truth (runtime + agent read order)

| Layer | Role | Paths |
|-------|------|-------|
| **Product registry** | Which products exist; canonical homes | `docs/products/PRODUCT_REGISTRY.json` |
| **Product home** | Human-facing product truth | `docs/products/<id>/PRODUCT_HOME.md` |
| **File manifest** | Machine ownership map for `@ssot` | `docs/products/<id>/FILE_MANIFEST.json` |
| **Machine queue** | Active build order | `builderos-reboot/BP_PRIORITY.json` |
| **Point B** | Current program lock | `builderos-reboot/POINT_B_TARGET.json` |

**Rule:** If a path is in `FILE_MANIFEST.json` for a product, its live `@ssot` must point at that product's `PRODUCT_HOME.md` (or an approved shared dependency), **not** an amendment file.

Verify: `npm run lifeos:product-home:verify`

---

## Law / history anchors (not primary product homes)

| Layer | Role | Do not use for |
|-------|------|----------------|
| **Amendments** | Constitutional law, append-only receipts | First read for product behavior |
| **Mission FOUNDER_PACKET / BLUEPRINT** | Build intent for one mission | Runtime `@ssot` without manifest check |
| **Mission `CONTENT/` copies** | Slice snapshots for promotion / diff | Import paths, deploy truth, cold-agent product law |
| **Change receipt tables** | Session history | Current runtime state without re-verify |
| **Gap audits / alpha audits** | Point-in-time scans | Live capability claims without re-probe |
| **Conversation dumps** | Brainstorm + session archives | SSOT, `@ssot`, or shipped-state claims |

**Rule:** Treat these as **research / history / salvage** unless a file explicitly declares itself **CANONICAL** (product homes, registry, constitution).

---

## Mission `CONTENT/` (HARD boundary)

Path pattern: `builderos-reboot/MISSIONS/*/CONTENT/**`

- **NOT** runtime authority — even when filenames match `routes/` or `services/`.
- Live spine paths are listed in `docs/products/*/FILE_MANIFEST.json`.
- `CONTENT/` files may retain mission-era `@ssot` tags; that tag reflects **when the slice was captured**, not current product law.
- Any `CONTENT/` file with `@ssot docs/projects/AMENDMENT_*` **must** include `HISTORY_SNAPSHOT` in its header comment block.

Read: `builderos-reboot/MISSIONS/README.md`

---

## Conversation dumps (NOT AUTHORITATIVE)

Path: `docs/conversation_dumps/**`

- Brainstorm and session exports only.
- **Never** promote dump text to product law without explicit promotion into `PRODUCT_HOME.md` or an amendment receipt row.

---

## Hist domain (legacy factory)

Path: `builderos-reboot/HIST_DOMAIN_REGISTRY.json`, `prompts/00-HIST-LEGACY-BOUNDARY.md`

- Hist-owned artifacts are **read/salvage only** — not active product orchestration.

---

## Agent checklist

1. Product work → read `PRODUCT_REGISTRY.json` → product `PRODUCT_HOME.md` → `FILE_MANIFEST.json`.
2. Need history → read amendment / mission / dump **after** canonical home; label claims KNOW/THINK/GUESS.
3. Found `@ssot` on amendment in runtime spine → **drift**; fix or HALT.
4. Found `@ssot` on amendment in mission `CONTENT/` → **expected snapshot** if `HISTORY_SNAPSHOT` present; still do not import from `CONTENT/` for live behavior.
