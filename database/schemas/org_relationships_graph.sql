```sql
CREATE TABLE org_relationships_graph (
    relationship_id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    graph_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```