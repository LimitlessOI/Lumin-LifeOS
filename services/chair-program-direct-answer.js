/**
 * SYNOPSIS: Direct program answers from system_knowledge — no counsel drift on SMOS/SSOT asks.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
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
  if (/\?\s*$/.test(t)) return true;
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
    return [
      'Yes — same system, same API.',
      '',
      'Lumin IS the Chair. This drawer hits `POST /api/v1/lifeos/builderos/command-control/founder-interface/message` — the same path the platform uses.',
      'I load your **digital twin**, **DB thread**, **SSOT amendments**, and the **repo synopsis index** into facts before I answer.',
      'When you order a change, I route to **build_async** (BuilderOS council + commit) or a work executor (SMOS, system actions). `command_truth` in the response tells you if something actually ran.',
    ].join('\n');
  }

  const programs = systemFacts.program_context || [];
  const smos = programs.find((p) => p.id === 'smos');
  if ((smos || SMOS_TOPIC.test(t)) && SMOS_WORKFLOW.test(t)) {
    const lines = [
      'Our Social Media OS workflow (LifeRE, from your SSOT and `lifere-socialmediaos-bridge.js`):',
      '',
      '1. **Content brief** — topic/market locked; founder approves brief before scripts.',
      '2. **Coach** — council session on the approved brief (hooks, angles).',
      '3. **Record** — you record from the brief + coach output.',
      '4. **Post** — draft copy from the pack.',
      '5. **Publish** — approval queue only; nothing publishes without approved status.',
      '',
      'Founder chat can run this via the SMOS content executor (brief → coach → scripts from your hooks, not template videos).',
      'LifeRE UI: Social Media OS tab + `/api/v1/lifere/marketing/socialmediaos/*`.',
      'Authority: `docs/projects/AMENDMENT_41_MARKETINGOS.md`.',
    ];
    if (/relocation/i.test(input)) {
      lines.splice(2, 0, 'For **relocation content**: brief topic = relocation market you serve; hooks come from brief + research pack, then scripts per video type.');
    }
    return lines.join('\n');
  }

  const chair = programs.find((p) => p.id === 'lumin_chair');
  const builderExplain = /\b(lumin|chair|builderos|builder)\b/i.test(t)
    && /\b(build|implement|change|how|explain)\b/i.test(t);
  if ((chair || builderExplain || systemFacts.builder_capability) && builderExplain) {
    return [
      'Yes. Lumin is the Chair — product changes go through BuilderOS, not theater.',
      '',
      '**How:** say what you want in the founder drawer (`/founder-interface/message`). UI/CSS orders route to `build_async` (council + commit). Explicit orders: `do: <change>` + `target_file: public/overlay/lifeos-app.html`.',
      'System path: `POST /api/v1/lifeos/builder/build` with task + target_file when running from operator shell.',
      'Content work (SMOS): brief → coach → scripts via the SMOS executor — not generic video templates.',
      'Context: SSOT excerpts, repo synopsis, twin profile, and this thread are loaded every turn.',
    ].join('\n');
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
