```sql
CREATE TABLE vr_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP
);

CREATE TABLE nft_mints (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    nft_id VARCHAR(255) NOT NULL,
    minted_at TIMESTAMP NOT NULL
);

-- Additional tables as per `databaseChanges` schema can be added here.
```