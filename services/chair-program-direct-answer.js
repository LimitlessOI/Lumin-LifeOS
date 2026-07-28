/**
 * SYNOPSIS: Direct program answers from system_knowledge — no counsel drift on SMOS/SSOT asks.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { needsSystemKnowledge } from './chair-system-knowledge.js';

const SMOS_TOPIC = /\b(smos|social media os|socialmediaos|relocation content|content brief|marketing os)\b/i;
const SMOS_WORKFLOW = /\b(smos|social media os|socialmediaos|workflow|relocation|content brief)\b/i;

export function shouldUseDirectProgramAnswer(input = '', systemFacts = {}) {
  const t = String(input || '').trim();
  if (!t) return false;
  if (/^\s*(do|execute|run)\s*:/i.test(t)) return false;

  const counselOnly = /\b(counsel only|do not run|don't run|without building|without running)\b/i.test(t);
  const explainAsk = /\b(explain|how do you|how you|walk me through|describe|tell me how)\b/i.test(t);
  if (counselOnly && !explainAsk) return false;

  if (/\b(connected|connection|system api|lifeos api|apis right now)\b/i.test(t) && /\b(you|lumin|chair|are you)\b/i.test(t)) {
    return Boolean(systemFacts.lumin_is_chair || systemFacts.builder_capability);
  }

  const hasSys = Boolean(systemFacts.system_knowledge) || Boolean(systemFacts.program_context?.length);
  if (!hasSys && !(counselOnly && explainAsk && systemFacts.builder_capability)) return false;

  if (systemFacts.program_context?.some((p) => {
    if (p.id === 'smos') return SMOS_WORKFLOW.test(t);
    if (p.id === 'builderos') return /\b(builderos|builder os|builder pipeline)\b/i.test(t);
    if (p.id === 'lumin_chair') {
      return /\b(lumin|the chair|builderos|builder)\b/i.test(t)
        && /\b(build|implement|change|how do you|how you|explain)\b/i.test(t);
    }
    if (p.id === 'ssot') return /\b(ssot|north star|amendment)\b/i.test(t);
    return false;
  })) return true;

  if (SMOS_TOPIC.test(t) && systemFacts.system_knowledge) return true;
  if (counselOnly && explainAsk && systemFacts.builder_capability) return true;
  return false;
}

export function shouldUseDirectFactualAnswer(input = '', systemFacts = {}) {
  const t = String(input || '').trim();
  if (!t || needsSystemKnowledge(t)) return false;
  if (/^\s*(do|execute|run)\s*:/i.test(t)) return false;
  if (
    systemFacts.recent_thread
    && /\b(just|earlier|previous|this thread|remember|asked you|told you|we said|exact phrase|code phrase)\b/i.test(t)
  ) {
    return false;
  }
  const search = String(systemFacts.verified_search || '').trim();
  if (search.length < 24) return false;
  const qTokens = t.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 4);
  if (qTokens.length) {
    const hits = qTokens.filter((w) => search.toLowerCase().includes(w)).length;
    if (hits < Math.min(2, Math.max(1, Math.ceil(qTokens.length * 0.2)))) return false;
  }
  if (/\?\s$/.test(t)) return true;
  return /^(what|who|when|where|why|how|is|are|does|did|can|could|tell me about)\b/i.test(t);
}

export function formatDirectFactualAnswer(input = '', systemFacts = {}) {
  const t = String(input || '').trim();
  const search = String(systemFacts.verified_search || '').trim();
  if (!search) return null;

  const source = systemFacts.search_source || 'web search';
  if (/\bfederal funds rate\b/i.test(t) || /\bfed funds\b/i.test(t)) {
    const rateHint = search.match(
      /\d+(?:\.\d+)?\s*(?:%|percent)|target range[^.\n]{0,160}|federal funds rate[^.\n]{0,200}/i,
    );
    if (rateHint) {
      return `From verified ${source}: the federal funds rate ${rateHint[0].replace(/^the federal funds rate\s*/i, '')}. Full search:\n${search.slice(0, 900)}`;
    }
  }

  return `From verified ${source}:\n${search.slice(0, 1200)}`;
}

export function formatDirectProgramAnswer(input = '', systemFacts = {}) {
  const t = String(input || '').trim();

  if (/\b(connected|connection|system api|lifeos api|apis right now)\b/i.test(t) && /\b(you|lumin|chair|are you)\b/i.test(t)) {
    return 'Lumin is the Chair. This drawer posts to `POST /api/v1/lifeos/builderos/command-control/founder-interface/message` — same system, same API. I load the digital twin, DB thread, SSOT amendments, and repo synopsis before I answer. Ordered changes route to `build_async` (BuilderOS council + commit); `command_truth` in the response reports whether something actually ran.';
  }

  const programs = systemFacts.program_context || [];
  const smos = programs.find((p) => p.id === 'smos');
  if ((smos || SMOS_TOPIC.test(t)) && SMOS_WORKFLOW.test(t)) {
    let base = String(systemFacts.system_knowledge || '').trim();
    if (base.length < 80) {
      base = 'SMOS workflow phases: consent → session → coach → extract → generate → approve → export (MarketingOS Phase 1 on `/api/v1/marketing/*`). Authority: `docs/products/marketingos/PRODUCT_HOME.md`.';
    }
    const relocationNote = /relocation/i.test(input)
      ? ' For relocation content, the coach stage narrates the market angle (seller hesitation, buyer education) and extract pulls story + objection heaviest.'
      : '';
    return base + relocationNote;
  }

  const chair = programs.find((p) => p.id === 'lumin_chair');
  const builderExplain = /\b(lumin|chair|builderos|builder)\b/i.test(t)
    && /\b(build|implement|change|how|explain)\b/i.test(t);
  if ((chair || builderExplain || systemFacts.builder_capability) && builderExplain) {
    return 'Lumin is the Chair. Product/UI changes route to `build_async` (BuilderOS council + commit). System path: `POST /api/v1/lifeos/builder/build` with task + target_file. Content work (SMOS) uses the SMOS executor — brief → coach → scripts — not generic video templates. SSOT excerpts, repo synopsis, twin profile, and this thread load every turn.';
  }

  if (/\b(ssot|north star|amendment)\b/i.test(t) && systemFacts.system_knowledge) {
    const block = String(systemFacts.system_knowledge || '').slice(0, 4000);
    if (block.length > 80) return block;
  }

  const block = String(systemFacts.system_knowledge || '').slice(0, 3500);
  if (block.length > 80) {
    return block;
  }
  return null;
}