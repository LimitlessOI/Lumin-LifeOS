// scripts/cards/parse-seed.mjs
// Reads todos/ALL_CARDS.md and emits a JSON plan for /api/v1/build/apply-plan
//
// Output shape:
// {
//   summary: "Process N cards from seed",
//   actions: [
//     { title, rationale, risk, files: [{path,type:"create",hint}, ...] },
//     ...
//   ]
// }

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, "..", "..");
const SEED = path.join(ROOT, "todos", "ALL_CARDS.md");

function slurp(p) {
  if (!fs.existsSync(p)) throw new Error(`Seed not found: ${p}`);
  return fs.readFileSync(p, "utf8");
}

// very light parser: splits by "\n---\n" boundaries and extracts Title/Files/Hints
function parseCards(md) {
  // keep only content after first delimiter to ignore the header
  const blocks = md.split(/\n---\n/g).map(s => s.trim()).filter(Boolean);

  // Filter blocks that look like a CARD section
  const cards = blocks.filter(b => /^#\s*CARD:/mi.test(b));
  const actions = [];

  for (const block of cards) {
    const idMatch = block.match(/^#\s*CARD:\s*([^\n]+)\n/i);
    const titleMatch = block.match(/^\s*##\s*Title\s*\n([\s\S]*?)(?:\n##|\n$)/mi);
    const filesMatch = block.match(/^\s*##\s*Files\s*\n([\s\S]*?)(?:\n##|\n$)/mi);
    const hintsMatch = block.match(/^\s*##\s*Hints\s*\n([\s\S]*?)(?:\n##|\n$)/mi);

    const cardId = idMatch ? idMatch[1].trim() : "unknown_card";
    const title = (titleMatch ? titleMatch[1] : cardId).trim().replace(/\r/g, "");
    const hintsRaw = (hintsMatch ? hintsMatch[1] : "").trim().replace(/\r/g, "");
    const filesRaw = (filesMatch ? filesMatch[1] : "").trim().replace(/\r/g, "");

    // collect - lines under Files
    const filePaths = filesRaw
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.startsWith("- "))
      .map(l => l.replace(/^- /, "").trim());

    if (!filePaths.length) continue;

    // make a single action per card, with all listed files
    const files = filePaths.map(fp => ({
      path: fp,
      type: "create",
      hint: `From seed ${cardId}: ${title}\n---\n${hintsRaw || "Write the content this file calls for."}`
    }));

    actions.push({
      title: `[${cardId}] ${title}`,
      rationale: `Scaffold files requested by seed card ${cardId}.`,
      risk: "low",
      files
    });
  }

  return {
    summary: `Process ${actions.length} card(s) from todos/ALL_CARDS.md`,
    actions
  };
}

function main() {
  const md = slurp(SEED);

  // guard: ensure file really includes cards
  if (!/^#\s*CARD:/m.test(md) && !/\n#\s*CARD:/m.test(md)) {
    throw new Error("No cards found in seed. Make sure sections start with '# CARD: ...'.");
  }

  const plan = parseCards(md);
  process.stdout.write(JSON.stringify(plan, null, 2));
}

main();
