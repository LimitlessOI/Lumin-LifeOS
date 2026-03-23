/**
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */
import { promises as fsPromises } from "fs";
import path from "path";

export async function initDatabase(pool, logger) {
  const sqlPath = path.join(process.cwd(), "db", "migrations", "20260313_core_schema.sql");
  let sql;
  try {
    sql = await fsPromises.readFile(sqlPath, "utf8");
  } catch (error) {
    logger.error("[DB] Could not read migration:", { error: error.message });
    throw error;
  }

  const statements = sql
    .split(/;\s*\n/)
    .filter((s) => s.trim().length > 0 && !s.trim().startsWith("--"));

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (e) {
      if (!e.message.includes("already exists")) throw e;
    }
  }
  logger.info("[DB] Schema initialized");
}

export async function ensureTcoAgentTables(pool, logger, rootDir) {
  try {
    await pool.query("SELECT 1 FROM tco_agent_interactions LIMIT 1");
    return true;
  } catch (error) {
    if (error?.code !== "42P01") {
      logger.warn("⚠️ TCO tables check failed:", { error: error.message });
      return false;
    }
  }

  logger.info("ℹ️ TCO tables missing; creating from migrations/create_tco_agent_tables.sql");
  try {
    const sqlPath = path.join(rootDir, "database", "migrations", "create_tco_agent_tables.sql");
    const sql = await fsPromises.readFile(sqlPath, "utf-8");
    await pool.query(sql);
    logger.info("✅ Created TCO agent tables");
    return true;
  } catch (error) {
    logger.error("❌ Failed to create TCO agent tables:", { error: error.message });
    return false;
  }
}
