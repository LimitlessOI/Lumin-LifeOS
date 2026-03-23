/**
 * Knowledge Context — loads project documentation (TRUE_VISION.md, CORE_TRUTHS.md,
 * PROJECT_CONTEXT.md) and knowledge index entries into a cached in-memory context
 * that council prompts can draw from at request time.
 *
 * Dependencies: fs, path, ../core/memory-system.js
 * Exports: loadKnowledgeContext(), injectKnowledgeContext(prompt), getKnowledgeContext()
 * @ssot docs/projects/AMENDMENT_13_KNOWLEDGE_BASE.md
 */
import fs from "fs";
import path from "path";
import memorySystem from "../core/memory-system.js";

const projectRoot = process.cwd();
const docsDir = path.join(projectRoot, "docs");
const knowledgeIndexPath = path.join(projectRoot, "knowledge", "index", "entries.jsonl");

let knowledgeContext = null;

export async function loadKnowledgeContext() {
  try {
    const context = {
      trueVision: null,
      coreTruths: null,
      projectContext: null,
      entries: [],
      totalEntries: 0,
    };

    const trueVisionPath = path.join(docsDir, "TRUE_VISION.md");
    if (fs.existsSync(trueVisionPath)) {
      context.trueVision = fs.readFileSync(trueVisionPath, "utf-8");
      console.log("📚 [KNOWLEDGE] Loaded TRUE_VISION.md (PRIMARY FOUNDATION)");
    } else {
      console.warn("⚠️ [KNOWLEDGE] TRUE_VISION.md not found - this is the foundational mission document");
    }

    const coreTruthsPath = path.join(docsDir, "CORE_TRUTHS.md");
    if (fs.existsSync(coreTruthsPath)) {
      context.coreTruths = fs.readFileSync(coreTruthsPath, "utf-8");
      console.log("📚 [KNOWLEDGE] Loaded CORE_TRUTHS.md");
    }

    const projectContextPath = path.join(docsDir, "PROJECT_CONTEXT.md");
    if (fs.existsSync(projectContextPath)) {
      context.projectContext = fs.readFileSync(projectContextPath, "utf-8");
      console.log("📚 [KNOWLEDGE] Loaded PROJECT_CONTEXT.md");
    }

    if (fs.existsSync(knowledgeIndexPath)) {
      const lines = fs.readFileSync(knowledgeIndexPath, "utf-8")
        .split("\n")
        .filter(Boolean);
      const entries = lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean);

      context.entries = entries;
      context.totalEntries = entries.length;
      console.log(`📚 [KNOWLEDGE] Loaded ${entries.length} entries from index`);
    } else {
      console.log("📚 [KNOWLEDGE] No index found - run: node scripts/process-knowledge.js");
    }

    knowledgeContext = context;
    return context;
  } catch (error) {
    console.warn(`⚠️ [KNOWLEDGE] Could not load knowledge context: ${error.message}`);
    return null;
  }
}

export function getKnowledgeContext() {
  return knowledgeContext;
}

function filterIdeas(entries = []) {
  const ideas = [];
  for (const entry of entries) {
    if (entry.ideas && Array.isArray(entry.ideas)) {
      const validIdeas = entry.ideas.filter((idea) => {
        const ideaText = (typeof idea === "string" ? idea : idea.text || "").toLowerCase();
        const codePatterns = ["this.currentapp", "function(", "const ", "let ", "var ", "=>", "{}", "()"];
        return (
          ideaText.length > 20 &&
          !codePatterns.some((pattern) => ideaText.includes(pattern))
        );
      });

      ideas.push(
        ...validIdeas.map((idea) => ({
          text: typeof idea === "string" ? idea : idea.text || String(idea),
          source: entry.filename,
        }))
      );
    }
  }
  return ideas;
}

function appendRelevantIdeas(contextSection, prompt, entries, maxIdeas) {
  const kcEntries = Array.isArray(entries) ? entries : [];
  if (kcEntries.length === 0) {
    return contextSection;
  }

  const allIdeas = filterIdeas(kcEntries);
  if (allIdeas.length === 0) {
    return contextSection;
  }

  const promptKeywords = prompt.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const relevantIdeas = allIdeas
    .filter((idea) => {
      const ideaText = idea.text.toLowerCase();
      return promptKeywords.some((kw) => ideaText.includes(kw));
    })
    .slice(0, maxIdeas);

  if (relevantIdeas.length === 0) {
    return contextSection;
  }

  contextSection += "\n\n=== RELEVANT IDEAS FROM KNOWLEDGE BASE ===\n";
  relevantIdeas.forEach((idea, index) => {
    contextSection += `${index + 1}. ${idea.text.substring(0, 200)}\n   (Source: ${idea.source})\n`;
  });

  return contextSection;
}

// In-process SOT cache — avoids a DB round-trip on every AI call.
// Refreshes every 10 minutes.
let _sotCache = null;
let _sotCacheAt = 0;
const SOT_CACHE_TTL_MS = 10 * 60 * 1000;

async function _getSOTContent() {
  const now = Date.now();
  if (_sotCache !== null && (now - _sotCacheAt) < SOT_CACHE_TTL_MS) {
    return _sotCache;
  }
  try {
    const mems = await memorySystem.retrieveMemories("facts", {
      minConfidence: 1.0,
      type: memorySystem.MEMORY_TYPES.SYSTEM_FACT,
      limit: 1,
    });
    const content = mems[0]?.content?.content || null;
    _sotCache = content;
    _sotCacheAt = now;
    return content;
  } catch {
    return _sotCache; // return stale rather than nothing
  }
}

/**
 * buildSystemContext — returns just the knowledge/SOT section (no user prompt).
 * Intended to be inserted into the system message so providers can cache it.
 */
export async function buildSystemContext(prompt, maxIdeas = 3) {
  let section = "";

  const sotContent = await _getSOTContent();
  if (sotContent) {
    section += `[SOT: LifeOS/LimitlessOS — supersedes all]\n${sotContent.substring(0, 1200)}\n[/SOT]\n`;
  }

  const ctx = knowledgeContext;
  if (ctx) {
    if (ctx.trueVision) {
      section += `[VISION]\n${ctx.trueVision.substring(0, 1000)}\n[/VISION]\n`;
    }
    if (ctx.coreTruths) {
      section += `[TRUTHS]\n${ctx.coreTruths.substring(0, 700)}\n[/TRUTHS]\n`;
    }
    if (ctx.projectContext) {
      section += `[CTX]\n${ctx.projectContext.substring(0, 500)}\n[/CTX]\n`;
    }
    section = appendRelevantIdeas(section, prompt, ctx.entries, maxIdeas);
  }

  return section;
}

/**
 * injectKnowledgeContext — legacy compat. Now delegates to buildSystemContext
 * and wraps the user prompt for callers that still expect a single string.
 */
export async function injectKnowledgeContext(prompt, maxIdeas = 5) {
  const section = await buildSystemContext(prompt, maxIdeas);
  if (section) {
    return `${section}\n[REQUEST]\n${prompt}\n[/REQUEST]`;
  }
  return prompt;
}
