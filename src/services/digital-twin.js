// Digital Twin Service

const { Client } = require('pg'); // PostgreSQL client
const { PineconeClient } = require('@pinecone-database/pinecone');
const { extractPatterns } = require('./pattern-learner');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});
const pinecone = new PineconeClient();

async function initializeDatabase() {
    await dbClient.connect();
    await dbClient.query(`CREATE TABLE IF NOT EXISTS twin_patterns (pattern_type VARCHAR(255), description TEXT, confidence FLOAT, examples TEXT[], last_updated TIMESTAMP);`);
}

async function storePattern(pattern) {
    const query = `INSERT INTO twin_patterns (pattern_type, description, confidence, examples, last_updated) VALUES ($1, $2, $3, $4, $5)`;
    const values = [pattern.type, pattern.description, pattern.confidence, pattern.examples, new Date()];
    await dbClient.query(query, values);
}

async function retrievePatterns() {
    const res = await dbClient.query(`SELECT * FROM twin_patterns;`);
    return res.rows;
}

async function fetchSimilarPatterns(embedding) {
    // Use Pinecone to fetch similar patterns based on the embedding
    const results = await pinecone.query({
        vector: embedding,
        top_k: 5,
    });
    return results;
}

module.exports = { initializeDatabase, storePattern, retrievePatterns, fetchSimilarPatterns };