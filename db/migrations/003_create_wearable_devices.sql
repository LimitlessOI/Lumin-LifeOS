```sql
CREATE TABLE wearable_devices (
    id SERIAL PRIMARY KEY,
    device_id UUID NOT NULL,
    user_id INT NOT NULL,
    model VARCHAR(255),
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);