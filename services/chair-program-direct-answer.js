/**
 * SYNOPSIS: Direct program answers from system_knowledge — no counsel drift on SMOS/SSOT asks.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

export function shouldUseDirectProgramAnswer(input = '', systemFacts = {}) {
  const t = String(input || '').trim();
  if (!t || systemFacts.personal_turn) return false;
  if (!systemFacts.system_knowledge || !systemFacts.program_context?.length) return false;
  if (/^\s*(do|execute|run)\s*:/i.test(t)) return false;
  return systemFacts.program_context.some((p) => {
    if (p.id === 'smos') return /\b(smos|social media os|socialmediaos)\b/i.test(t);
    if (p.id === 'builderos') return /\b(builderos|builder os|builderos)\b/i.test(t);
    if (p.id === 'lumin_chair') return /\b(lumin|the chair|builderos)\b/i.test(t) && /\b(build|implement|change)\b/i.test(t);
    if (p.id === 'ssot') return /\b(ssot|north star|amendment)\b/i.test(t);
    return false;
  });
}

export function formatDirectProgramAnswer(input = '', systemFacts = {}) {
  const programs = systemFacts.program_context || [];
  const smos = programs.find((p) => p.id === 'smos');
  if (smos && /\b(smos|social media os|socialmediaos)\b/i.test(input)) {
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
  if (chair && /\b(lumin|chair|builderos|builder)\b/i.test(input) && /\b(build|implement|change)\b/i.test(input)) {
    return [
      'Yes. Lumin is the Chair — product changes go through BuilderOS, not theater.',
      '',
      '**How:** say what you want in the founder drawer (`/founder-interface/message`). UI/CSS orders route to `build_async` (council + commit). Explicit orders: `do: <change>` + `target_file: public/overlay/lifeos-app.html`.',
      'System path: `POST /api/v1/lifeos/builder/build` with task + target_file when running from operator shell.',
      'Content work (SMOS): brief → coach → scripts via the SMOS executor — not generic video templates.',
    ].join('\n');
  }

  const block = String(systemFacts.system_knowledge || '').slice(0, 3500);
  if (block.length > 80) {
    return block;
  }
  return null;
}
