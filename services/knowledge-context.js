/**
 * Knowledge Context — loads project documentation (SSOT/vision/truths/context)
 * and the knowledge index into a cached in-memory context
 * that council prompts can draw from at request time.
 *
 * Dependencies: fs, path, ../core/memory-system.js
 * Exports: loadKnowledgeContext(), injectKnowledgeContext(prompt), getKnowledgeContext()
 */
import fs from "fs";
import path from "path";
import memorySystem from "../core/memory-system.js";

const projectRoot = process.cwd();
const docsDir = path.join(projectRoot, "docs");
const knowledgeIndexPath = path.join(projectRoot, "knowledge", "index", "entries.jsonl");

let knowledgeContext = null;

function compactText(text, maxChars) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/`{3}[\s\S]*?`{3}/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function firstMatch(text, pattern, fallback = "") {
  const match = String(text || "").match(pattern);
  return match?.[1]?.trim() || fallback;
}

function extractBulletLines(text, limit = 3) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .slice(0, limit)
    .map((line) => line.replace(/^- /, "").trim());
}

function buildStaticKernel(context) {
  const ssot = context.ssotNorthStar || "";
  const vision = context.trueVision || "";
  const truths = context.coreTruths || "";
  const project = context.projectContext || "";

  const mission = firstMatch(ssot, /## ARTICLE I: MISSION\s+([\s\S]*?)\n\n## /, "Speed to validated revenue while protecting ethics, consent, and user dignity.");
  const strategy = firstMatch(ssot, /ONE killer feature[^.\n]*/i, "ONE killer feature -> ONE paying segment -> ONE economic model -> then expand.");
  const evidenceRules = extractBulletLines(firstMatch(ssot, /### 2\.3 Evidence Rule \(No Blind Instructions\)\s+([\s\S]*?)\n\n### /, ""), 2);
  const failClosedRules = extractBulletLines(firstMatch(ssot, /### 2\.5 Fail-Closed Rule \(Safety First\)\s+([\s\S]*?)\n\n## /, ""), 2);
  const visionOverview = extractBulletLines(firstMatch(vision, /## Overview\s+([\s\S]*?)\n\n## /, ""), 2);
  const currentGoal = firstMatch(vision, /### Phase 1: [^\n]+\n\n\*\*Goal:\*\*\s*([^\n]+)/, "Make money fast so the system cannot be controlled by profit motives.");
  const businessModel = firstMatch(truths, /## 2\. Business Model\s+([^\n]+)/, "We take 20% of customer API savings. No savings = no payment.");
  const architecture = extractBulletLines(firstMatch(truths, /## 3\. Architecture\s+([\s\S]*?)\n\n## /, ""), 3);
  const revenuePriority = extractBulletLines(firstMatch(truths, /## 6\. Revenue Priority\s+([\s\S]*?)\n\n## /, ""), 2);
  const immediateGoals = String(project)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line))
    .slice(0, 2)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim());

  const lines = [
    `Mission: ${compactText(mission, 140)}`,
    `Strategy: ${compactText(strategy, 120)}`,
    `Business model: ${compactText(businessModel, 100)}`,
    evidenceRules[0] ? `Evidence: ${compactText(evidenceRules[0], 110)}` : "",
    failClosedRules[0] ? `Safety: ${compactText(failClosedRules[0], 110)}` : "",
    visionOverview.length > 0 ? `Scope: ${compactText(visionOverview.join("; "), 110)}` : "",
    `Current priority: ${compactText(currentGoal, 110)}`,
    architecture.length > 0 ? `Runtime: ${compactText(architecture.join("; "), 120)}` : "",
    revenuePriority.length > 0 ? `Revenue: ${compactText(revenuePriority.join("; "), 120)}` : "",
    immediateGoals.length > 0 ? `Immediate goals: ${compactText(immediateGoals.join("; "), 140)}` : "",
  ].filter(Boolean);

  return `[KERNEL]\n${lines.join("\n")}\n[/KERNEL]`;
}

export async function loadKnowledgeContext() {
  try {
    const context = {
      ssotNorthStar: null,
      trueVision: null,
      coreTruths: null,
      projectContext: null,
      entries: [],
      totalEntries: 0,
      staticKernel: "",
    };

    const ssotNorthStarPath = path.join(docsDir, "SSOT_NORTH_STAR.md");
    if (fs.existsSync(ssotNorthStarPath)) {
      context.ssotNorthStar = fs.readFileSync(ssotNorthStarPath, "utf-8");
      console.log("📚 [KNOWLEDGE] Loaded SSOT_NORTH_STAR.md");
    }

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

    context.staticKernel = buildStaticKernel(context);
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

  contextSection += "\n[IDEAS]\n";
  relevantIdeas.forEach((idea, index) => {
    contextSection += `${index + 1}. ${compactText(idea.text, 120)}\n`;
  });
  contextSection += "[/IDEAS]\n";

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

function compactSOTContent(sotContent) {
  if (!sotContent) return "";
  const lines = String(sotContent)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-=]{3,}$/.test(line))
    .slice(0, 4)
    .map((line) => compactText(line, 120));
  return lines.join("\n");
}

/**
 * buildSystemContext — returns just the knowledge/SOT section (no user prompt).
 * Intended to be inserted into the system message so providers can cache it.
 */
export async function buildSystemContext(prompt, options = {}) {
  const {
    maxIdeas = 2,
    taskType = "general",
    includeIdeas = true,
  } = typeof options === "number" ? { maxIdeas: options } : options;

  let section = "";

  const sotContent = await _getSOTContent();
  if (sotContent) {
    const compactSOT = compactSOTContent(sotContent);
    if (compactSOT) {
      section += `[SOT]\n${compactSOT}\n[/SOT]\n`;
    }
  }

  const ctx = knowledgeContext;
  if (ctx) {
    if (ctx.staticKernel) {
      section += `${ctx.staticKernel}\n`;
    }
    const ideasAllowed = includeIdeas && !["routing", "classification", "validation", "health", "status"].includes(taskType);
    if (ideasAllowed) {
      section = appendRelevantIdeas(section, prompt, ctx.entries, maxIdeas);
    }
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
