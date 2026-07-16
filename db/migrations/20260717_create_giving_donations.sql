-- SYNOPSIS: Database migration — 20260717_create_giving_donations.sql.
CREATE TABLE IF NOT EXISTS giving_donations (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    donor_id bigint,
    title text NOT NULL,
    description text,
    condition text,
    category text,
    location text,
    images jsonb DEFAULT '[]'::jsonb,
    donor_contact text,
    claimer_id bigint,
    claimer_contact text,
    status text DEFAULT 'available',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    claimed_at timestamptz,
    handed_off_at timestamptz
);

-- Trigger function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on update
CREATE TRIGGER update_giving_donations_updated_at
BEFORE UPDATE ON giving_donations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
