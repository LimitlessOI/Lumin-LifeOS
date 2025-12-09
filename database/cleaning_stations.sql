```sql
CREATE TABLE cleaning_stations (
    id SERIAL PRIMARY KEY,
    station_id UUID NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50),
    last_cleaned TIMESTAMPTZ
);
```