```javascript
const pool = require('../config/database');

exports.createClient = async (req, res) => {
    const { name, email } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO stripe_optimization_clients (name, email) VALUES ($1, $2) RETURNING *',
            [name, email]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error creating client', error: err.message });
    }
};

exports.getClients = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM stripe_optimization_clients');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching clients', error: err.message });
    }
};

exports.getClientById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM stripe_optimization_clients WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching client', error: err.message });
    }
};

exports.updateClient = async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    try {
        const result = await pool.query(
            'UPDATE stripe_optimization_clients SET name = $1, email = $2 WHERE id = $3 RETURNING *',
            [name, email, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error updating client', error: err.message });
    }
};

exports.deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM stripe_optimization_clients WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.status(200).json({ message: 'Client deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting client', error: err.message });
    }
};
```