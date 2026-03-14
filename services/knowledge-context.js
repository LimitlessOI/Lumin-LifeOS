/**
 * Knowledge Context — loads project documentation (TRUE_VISION.md, CORE_TRUTHS.md,
 * PROJECT_CONTEXT.md) and knowledge index entries into a cached in-memory context
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

export async function injectKnowledgeContext(prompt, maxIdeas = 5) {
  let contextSection = "";

  try {
    const sourceOfTruthMemories = await memorySystem.retrieveMemories("facts", {
      minConfidence: 1.0,
      type: memorySystem.MEMORY_TYPES.SYSTEM_FACT,
      limit: 1,
    });

    if (sourceOfTruthMemories.length > 0) {
      const sotMemory = sourceOfTruthMemories[0];
      if (sotMemory.content && typeof sotMemory.content === "object" && sotMemory.content.content) {
        contextSection += `\n\n╔══════════════════════════════════════════════════════════════════════════════════╗\n`;
        contextSection += `║                                                                                  ║\n`;
        contextSection += `║  🎯 ABSOLUTE SOURCE OF TRUTH - LifeOS / LimitlessOS (v1.0)                      ║\n`;
        contextSection += `║  This document supersedes ALL other context. Reference this for ALL decisions.  ║\n`;
        contextSection += `║                                                                                  ║\n`;
        contextSection += `╚══════════════════════════════════════════════════════════════════════════════════╝\n\n`;
        contextSection += `${sotMemory.content.content}\n\n`;
        contextSection += `╔══════════════════════════════════════════════════════════════════════════════════╗\n`;
        contextSection += `║  END OF SOURCE OF TRUTH                                                          ║\n`;
        contextSection += `╚══════════════════════════════════════════════════════════════════════════════════╝\n\n`;
      }
    }
  } catch (sotError) {
    console.warn("⚠️ [CONTEXT] Could not load Source of Truth from memory:", sotError.message);
  }

  const ctx = knowledgeContext;
  if (ctx) {
    if (ctx.trueVision) {
      contextSection += `\n\n=== FOUNDATION: TRUE VISION (Secondary to Source of Truth) ===\n${ctx.trueVision}\n`;
    }
    if (ctx.coreTruths) {
      contextSection += `\n\n=== CORE TRUTHS (Immutable Principles) ===\n${ctx.coreTruths.substring(0, 2000)}\n`;
    }
    if (ctx.projectContext) {
      contextSection += `\n\n=== PROJECT CONTEXT ===\n${ctx.projectContext.substring(0, 1500)}\n`;
    }
  }

  contextSection = appendRelevantIdeas(contextSection, prompt, ctx?.entries, maxIdeas);
  contextSection = appendRelevantIdeas(contextSection, prompt, ctx?.entries, maxIdeas);

  if (contextSection) {
    return `${contextSection}\n\n=== USER REQUEST ===\n${prompt}\n\n⚠️ CRITICAL: All responses must align with the SOURCE OF TRUTH above. Reference it for ALL decisions, product choices, and ethical considerations.`;
  }

  return prompt;
}
