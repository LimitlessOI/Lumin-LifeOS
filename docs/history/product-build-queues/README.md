<!-- SYNOPSIS: Archived product BUILD_QUEUE files — dead, not live, not SSOT -->

# THESE ARE NOT LIVE QUEUES

**Founder law (2026-08-12 → 2026-08-13):** there is **one** manufacturing queue. It manages **multiple factories** and **more than one project** by enrolling slices pulled from product blueprints. It does **not** mint a second `BUILD_QUEUE.json` per product.

The only live `BUILD_QUEUE.json` is:

`docs/products/universal-overlay/BUILD_QUEUE.json`

Steps in that file may carry `product_id` (e.g. `collectibles`) and `source` citing the product BP. Factories claim work by lane ownership of `target_file`.

Every other product/project queue that used to live under `docs/products/<id>/BUILD_QUEUE.json` or `docs/projects/**/BUILD_QUEUE.json` was **moved** here — including a mistaken Collectibles second-queue attempt (`collectibles/`).

If something still calls `loadBuildQueue('lifeos')` or writes a second queue, it is supposed to throw `SECOND_QUEUE_FORBIDDEN` / `NEW_QUEUE_FORBIDDEN`. That is the point.

Do not put these files back. Do not plan a new queue for a non-overlay product. Enroll BP slices into the one queue.
