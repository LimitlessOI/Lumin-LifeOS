-- SYNOPSIS: Database migration — BPB-0001 Mission Runtime: add 12 mission-runtime columns to the pre-existing `commitments` table.
-- @ssot docs/products/builderos/PRODUCT_HOME.md

-- Spec reference:
-- ALTER TABLE commitments ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

-- mission_id is added first without the FK so this patch is independent of the
-- `missions` table creation order. The FK is applied conditionally below.
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS mission_id UUID;

-- Remaining 11 mission-runtime columns (one statement per column to keep the
-- `ADD COLUMN IF NOT EXISTS` count clean for static preflight checks).
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS commitment_type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS rejected_by UUID;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS board_item_id UUID;

-- Apply foreign keys only when the referenced tables exist.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'missions'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_schema = 'public' AND table_name = 'commitments'
              AND constraint_name = 'fk_commitments_mission_id'
        ) THEN
            ALTER TABLE commitments
                ADD CONSTRAINT fk_commitments_mission_id
                FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE SET NULL;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'mission_board_items'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_schema = 'public' AND table_name = 'commitments'
              AND constraint_name = 'fk_commitments_board_item_id'
        ) THEN
            ALTER TABLE commitments
                ADD CONSTRAINT fk_commitments_board_item_id
                FOREIGN KEY (board_item_id) REFERENCES mission_board_items(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_commitments_mission_id ON commitments (mission_id);
