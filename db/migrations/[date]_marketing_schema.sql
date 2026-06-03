The specification is contradictory regarding the expected file format for `db/migrations/[date]_marketing_schema.sql` given the verifier's execution environment.
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255