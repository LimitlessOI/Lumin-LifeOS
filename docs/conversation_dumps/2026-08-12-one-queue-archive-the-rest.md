<!-- SYNOPSIS: Twin archive — one live BUILD_QUEUE; others moved so relying code breaks -->

# 2026-08-12 — Other queues archived (there can only be one)

Adam: there can only be one queue. Shut the others down, move them into the archive folder. If something still relies on them, it must break, noticeably.

Done: 39 files moved to `docs/history/product-build-queues/`. Live path is overlay only. `SECOND_QUEUE_FORBIDDEN` on load/plan/persist of anything else. No shims.

Follow-up same night: hard gate — no new queues may ever be created (`NEW_QUEUE_FORBIDDEN`).

