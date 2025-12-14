```sql
CREATE TABLE logistics_requests (
    id SERIAL PRIMARY KEY,
    request_id UUID NOT NULL UNIQUE,
    origin_location GEOGRAPHY(POINT, 4326) NOT NULL,
    destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
    package_details JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transfer_nodes (
    id SERIAL PRIMARY KEY,
    node_id UUID NOT NULL UNIQUE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    capacity INTEGER NOT NULL,
    current_load INTEGER DEFAULT 0,
    operational BOOLEAN DEFAULT TRUE
);

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_id UUID NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_location GEOGRAPHY(POINT, 4326),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE package_audit_trail (
    id SERIAL PRIMARY KEY,
    package_id UUID NOT NULL,
    event_description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);