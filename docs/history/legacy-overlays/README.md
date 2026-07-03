<!-- SYNOPSIS: Archive index — retired legacy founder-interface overlay prototypes -->

# Legacy Overlays Archive (cleanup batch 6)

Quarantine for the 12 **forbidden/dead** founder-interface overlay prototypes named in
`.cursor/rules/legacy-interfaces-forbidden.mdc`. They were still git-tracked under
`public/overlay/` and served (some as direct files, some as redirect stubs) despite the
rule marking them dead.

## What changed

- **Redirect-and-archive** (not hard-delete): every old `/overlay/<name>.html` path now
  returns `301 → /lifeos?direct_system=1` (the one canonical interface,
  `public/overlay/lifeos-app.html`) via `routes/public-routes.js`. No live 404s.
- Files moved here via `git mv` (history preserved; fully reversible).
- Runtime references to the dead files repointed to the canonical interface:
  - `services/lumin-connection-guard.js` UI-03 now asserts the **server-side redirect**
    (previously `readFileSync` of `lifeos-founder-interface.html`).
  - `core/codebase-reader.js` frontend build-context now reads `lifeos-app.html`
    (previously `command-center.html`).
  - `startup/routes/server-routes.js` file-write allowlist dropped `command-center.html`.
  - `scripts/check-overlay-syntax.js` no longer checks the retired `control.html` / `portal.html`.

## Restore a file

```
git mv docs/history/legacy-overlays/<name>.html public/overlay/<name>.html
# then remove its redirect line/loop entry in routes/public-routes.js
```

## Catalog

See `SALVAGE_INDEX.json` in this directory (12 entries). Each was a small client-side
redirect stub — no unique UI/logic to salvage.

## The one interface

`public/overlay/lifeos-app.html` — the only active founder interface. All routes point here.
