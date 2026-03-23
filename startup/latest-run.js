/**
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
import { promises as fsPromises } from "fs";
import path from "path";

export function createLatestRunManager(rootDir, logger) {
  const latestRunRoot = path.join(rootDir, "latest-run.json");
  const latestRunDoc = path.join(rootDir, "docs", "THREAD_REALITY", "latest-run.json");

  async function ensureLatestRunFile() {
    try {
      await fsPromises.access(latestRunRoot);
      return;
    } catch {}

    try {
      await fsPromises.access(latestRunDoc);
      await fsPromises.copyFile(latestRunDoc, latestRunRoot);
      return;
    } catch {}

    const template = {
      runDir: "",
      result: "UNVERIFIED",
      notes: "",
    };

    try {
      await fsPromises.writeFile(latestRunRoot, JSON.stringify(template, null, 2));
    } catch (error) {
      logger?.warn?.("[LATEST-RUN] unable to create placeholder:", { error: error.message });
    }
  }

  return {
    ensureLatestRunFile,
  };
}
