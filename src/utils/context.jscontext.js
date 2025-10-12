import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function buildSmartContext(repoPath, maxTokens = 2000) {
  const hasGit = fs.existsSync(path.join(repoPath, ".git"));
  try {
    let changedFiles = [];
    if (hasGit) {
      const { stdout: diff } = await execAsync(
        `cd "${repoPath}" && git diff HEAD~1 --name-only`,
        { maxBuffer: 1024 * 1024 }
      );
      changedFiles = diff.trim().split("\n").filter(Boolean);
    } else {
      // Fallback: focus on hot files when .git is absent (prod deploy)
      changedFiles = [
        "server.js",
        "todos/24HR-SPRINT.md",
        "todos/ALL_CARDS.md",
        "docs/auto/plan.md",
        "public/overlay/control.html",
        "public/overlay/index.html",
        "backlog.md"
      ].filter(f => fs.existsSync(path.join(repoPath, f)));
    }

    if (changedFiles.length === 0) {
      return { context: "No recent changes detected.", tokens_saved: 0 };
    }

    const fileContents = [];
    for (const file of changedFiles.slice(0, 10)) {
      const fullPath = path.join(repoPath, file);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).size < 50000) {
        const content = fs.readFileSync(fullPath, "utf8");
        fileContents.push(`### ${file}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\`\n`);
      }
    }

    const summary = `Repository: ${path.basename(repoPath)}
Recent changes: ${changedFiles.length} files modified
Focus files:\n${changedFiles.slice(0, 5).join("\n")}`;

    const context = `${summary}\n\n${fileContents.join("\n")}`;
    const estimatedTokens = Math.ceil(context.length / 4);
    const savedTokens = Math.max(0, 8000 - estimatedTokens);

    return {
      context: context.slice(0, maxTokens * 4),
      tokens_saved: savedTokens,
      files_included: changedFiles.length
    };
  } catch (e) {
    console.error("buildSmartContext error:", e);
    return { context: "Error building context", tokens_saved: 0 };
  }
}
