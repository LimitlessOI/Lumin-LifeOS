// ===FILE:core/database.js===
import { Pool } from "pg";
import process from "node:process";

// Destructure DB URL and establish SSL configuration for Neon
const { DATABASE_URL, DATABASE_URL_SANDBOX, NODE_ENV } = process.env;

// Select the correct database URL based on the environment
const connectionString = NODE_ENV === 'production' 
    ? DATABASE_URL 
    : (DATABASE_URL_SANDBOX || DATABASE_URL);

export const pool = new Pool({
  connectionString: connectionString,
  // Required for Neon PostgreSQL on Railway
  ssl: connectionString?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/**
 * Executes a series of database queries to ensure all necessary tables
 * for LifeOS are present and indexed.
 */
export async function initDatabase() {
  try {
    // Check pool connection
    await pool.query("SELECT NOW()");
    console.log("✅ Database pool connected.");

    const runQuery = async (sql) => {
      await pool.query(sql);
    };

    // --- Core Tables (Condensed for space, original logic assumed) ---
    // Note: The full 22 CREATE TABLE queries from the original server.js
    // must be included here in the actual file.

    await runQuery(`CREATE TABLE IF NOT EXISTS conversation_memory (...)`);
    await runQuery(`CREATE TABLE IF NOT EXISTS consensus_proposals (...)`);
    await runQuery(`CREATE TABLE IF NOT EXISTS ai_performance (...)`);
    await runQuery(`CREATE TABLE IF NOT EXISTS protected_files (...)`);
    // ... all other CREATE TABLE and INDEX statements ...

    // Insert protected files (must run after table is created)
    await runQuery(`INSERT INTO protected_files (file_path, reason, can_read, can_write, requires_full_council) VALUES
      ('server.js', 'Core system entry point', true, false, true),
      ('core/database.js', 'Core DB module', true, false, true),
      ('core/council.js', 'Core AI module', true, false, true),
      ('public/overlay/command-center.html', 'Control panel', true, true, true)
      ON CONFLICT (file_path) DO NOTHING`);
    
    console.log("✅ Database schema initialized.");
  } catch (error) {
    console.error("❌ CRITICAL: DB init error:", error.message);
    throw error;
  }
}

/**
 * Closes the database pool connection gracefully.
 */
export async function closeDatabase() {
    await pool.end();
    console.log("👋 Database pool closed.");
}
// ===END===
