```sql
CREATE TABLE b2b2c_tenants (
    id SERIAL PRIMARY KEY,
    tenant_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);