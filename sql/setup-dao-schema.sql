```sql
-- Create table for DAO members
CREATE TABLE IF NOT EXISTS dao_members (
    member_id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    reputation_score INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for DAO proposals
CREATE TABLE IF NOT EXISTS dao_proposals (
    proposal_id SERIAL PRIMARY KEY,
    proposer_id INTEGER REFERENCES dao_members(member_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for DAO votes
CREATE TABLE IF NOT EXISTS dao_votes (
    vote_id SERIAL PRIMARY KEY,
    proposal_id INTEGER REFERENCES dao_proposals(proposal_id),
    voter_id INTEGER REFERENCES dao_members(member_id),
    vote_value BOOLEAN NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for governance settings
CREATE TABLE IF NOT EXISTS governance_settings (
    setting_id SERIAL PRIMARY KEY,
    quorum_percentage DECIMAL(5, 2) NOT NULL,
    proposal_threshold INTEGER NOT NULL,
    voting_period_days INTEGER NOT NULL
);