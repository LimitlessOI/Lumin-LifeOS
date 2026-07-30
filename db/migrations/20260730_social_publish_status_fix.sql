-- SYNOPSIS: Fix creative_publish_queue status enum to include needs_connection
-- @ssot docs/products/creative-engine/PRODUCT_HOME.md

BEGIN;

ALTER TABLE creative_publish_queue DROP CONSTRAINT IF EXISTS creative_publish_queue_status_check;
ALTER TABLE creative_publish_queue ADD CONSTRAINT creative_publish_queue_status_check
  CHECK (status IN ('pending','ready','needs_connection','connected','publishing','published','needs_human','failed'));

COMMIT;
