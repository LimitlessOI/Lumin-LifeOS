const db = require('../db');

const createCapsule = async (title, content, category) => {
    const result = await db.query('INSERT INTO capsules (title, content, category, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', [title, content, category]);
    return { id: result.insertId, title, content, category };
};

const getAllCapsules = async () => {
    const [rows] = await db.query('SELECT * FROM capsules');
    return rows;
};

const updateCapsule = async (id, title, content, category) => {
    await db.query('UPDATE capsules SET title = ?, content = ?, category = ?, updated_at = NOW() WHERE id = ?', [title, content, category, id]);
    return getCapsuleById(id);
};

const deleteCapsule = async (id) => {
    await db.query('DELETE FROM capsules WHERE id = ?', [id]);
};

const searchCapsules = async (query) => {
    const [rows] = await db.query('SELECT * FROM capsules WHERE title LIKE ? OR content LIKE ?', [`%${query}%`, `%${query}%`]);
    return rows;
};

const getCapsuleById = async (id) => {
    const [rows] = await db.query('SELECT * FROM capsules WHERE id = ?', [id]);
    return rows[0];
};

module.exports = { createCapsule, getAllCapsules, updateCapsule, deleteCapsule, searchCapsules };