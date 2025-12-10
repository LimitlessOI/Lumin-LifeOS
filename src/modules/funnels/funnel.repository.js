```javascript
const db = require('../../db');

exports.getAll = async () => {
    return db.query('SELECT * FROM marketing_funnels');
};

exports.create = async (funnelData) => {
    const { name, description } = funnelData;
    const result = await db.query(
        'INSERT INTO marketing_funnels (name, description) VALUES ($1, $2) RETURNING *',
        [name, description]
    );
    return result.rows[0];
};

exports.findById = async (id) => {
    const result = await db.query('SELECT * FROM marketing_funnels WHERE id = $1', [id]);
    return result.rows[0];
};

exports.update = async (id, funnelData) => {
    const { name, description } = funnelData;
    const result = await db.query(
        'UPDATE marketing_funnels SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [name, description, id]
    );
    return result.rows[0];
};

exports.delete = async (id) => {
    const result = await db.query('DELETE FROM marketing_funnels WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
};
```