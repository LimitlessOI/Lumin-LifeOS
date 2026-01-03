-- File: migrations/001_create_user_table.sql
CREATE TABLE IF NOT EXISTS user (
    user_id SERIAL PRIMARY KEY,
    age_range VARCHAR(255),
    gender CHAR(1),
    interests TEXT[]
);

ALTER TABLE user OWNER TO postgres; -- or the appropriate database role that will own this table.