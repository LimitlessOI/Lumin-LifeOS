const { Client } = require('pg');
const axios = require('axios');

const db = new Client({
    user: 'your_user',
    host: 'localhost',
    database: 'your_database',
    password: 'your_password',
    port: 5432,
});

db.connect();

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/chat';
const API_KEY = 'your_anthropic_api_key';

async function createConversation(data) {
    const { userId, messages, title, tags } = data;
    const res = await db.query('INSERT INTO conversations (user_id, messages, title, tags) VALUES ($1, $2, $3, $4) RETURNING *', [userId, messages, title, tags]);
    return res.rows[0];
}

async function getConversations(userId) {
    const res = await db.query('SELECT * FROM conversations WHERE user_id = $1', [userId]);
    return res.rows;
}

async function updateConversation(id, data) {
    const { title, tags } = data;
    const res = await db.query('UPDATE conversations SET title = $1, tags = $2 WHERE id = $3 RETURNING *', [title, tags, id]);
    return res.rows[0];
}

async function chatWithClaude(messages) {
    const response = await axios.post(ANTHROPIC_API_URL, { messages }, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    return response.data;
}

module.exports = { createConversation, getConversations, updateConversation, chatWithClaude };