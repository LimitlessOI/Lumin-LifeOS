BEGIN TRANSA0; -- Begin a transaction for atomicity
CREATE TABLE IF NOT EXISTS overlay_games (
    overlayId UUID PRIMARY KEY,
    gameTitle VARCHAR(255) NOT NULL,
    developerName VARCHAR(255) NOT NULL
);
-- Table creation ends here with commit after all migrations are done to ensure atomicity.
COMMIT; -- End the transaction by committing changes made during this session.