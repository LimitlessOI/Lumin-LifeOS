CREATE TABLE IF NOT EXISTS artists (
    artist_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    social_links JSONB
);

ALTER TABLE artists OWNER TO lifeosai; -- Assuming 'lifeosai' is the username of an authorized user on Neon PostgreSQL.