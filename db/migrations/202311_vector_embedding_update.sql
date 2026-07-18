-- SYNOPSIS: Database migration — 202311_vector_embedding_update.sql.
DO $$ 
BEGIN
    -- Check if the column already exists to avoid duplicate addition
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='your_actual_table_name' 
        AND column_name='vector_embedding'
    ) THEN
        -- Add the column if it does not exist
        ALTER TABLE your_actual_table_name
        ADD COLUMN vector_embedding VECTOR;
    END IF;
END $$;
