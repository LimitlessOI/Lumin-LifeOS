/**
 * SYNOPSIS: Cognitive Chair — composes responsibilities, lenses (cognitive assets), and model selection
 * before any model answers "What should we do?".
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, '..');

const RESPONSIBILITY_DEFAULTS = {
  chair: {
    purpose: 'Hold the mission, choose the reasoning process, synthesize disagreement, and decide the next action.',
    default_member: 'claude_sonnet',
  },
  architect: {
    purpose: 'Turn approved intent into a complete, manufacturable digital twin.',
    default_member: 'claude_sonnet',
  },
  builder: {
    purpose: 'Execute the approved blueprint without product invention.',
    default_member: 'openai_builder_standard',
  },
  sentry: {
    purpose: 'Independently test the result against the mission and blueprint.',
    default_member: 'openai_gpt',
  },
  cfo: {
    purpose: 'Optimize cost, ROI, and efficiency without weakening founder intent.',
    default_member: 'openai_gpt',
  },
  wisdom: {
    purpose: 'Surface relevant memory, predictions, outcomes, and lessons.',
    default_member: 'century',
  },
  creative: {
    purpose: 'Design the complete customer-facing experience before implementation.',
    default_member: 'claude_sonnet',
  },
};

export function loadLensRegistry(root = DEFAULT_ROOT) {
  const registryPath = path.join(root, 'data', 'lenses', 'LENS_REGISTRY.json');
  const raw = readFileSync(registryPath, 'utf8');
  return JSON.parse(raw);
}

export function loadLens(lensId, root = DEFAULT_ROOT) {
  const registry = loadLensRegistry(root);
  const entry = registry.lenses.find((l) => l.lens_id === lensId);
  if (!entry) throw new Error(`Unknown lens: ${lensId}`);
  const lensPath = path.join(root, entry.path);
  if (!existsSync(lensPath)) throw new Error(`Lens file missing: ${lensPath}`);
  const raw = readFileSync(lensPath, 'utf8');
  const lens = JSON.parse(raw);
  return { ...entry, ...lens };
}

export function listLenses(root = DEFAULT_ROOT) {
  const registry = loadLensRegistry(root);
  return registry.lenses.map((l) => ({ lens_id: l.lens_id, name: l.name, responsibilities: l.responsibilities }));
}

export function resolveResponsibilities(responsibilityHints = []) {
  const hints = Array.isArray(responsibilityHints) ? responsibilityHints : [responsibilityHints];
  if (hints.length === 0) return ['chair'];
  return hints.map((h) => String(h).toLowerCase().trim());
}

export function selectLensesForResponsibility(responsibility, requestedLensIds = [], registry = null, root = DEFAULT_ROOT) {
  const reg = registry || loadLensRegistry(root);
  const available = reg.lenses.filter((l) => l.responsibilities.includes(responsibility));

  if (requestedLensIds && requestedLensIds.length > 0) {
    const ids = new Set(requestedLensIds.map((id) => String(id).toLowerCase().trim()));
    const selected = available.filter((l) => ids.has(l.lens_id));
    if (selected.length > 0) return selected;
    // If requested lenses are not in registry, try to load them directly as a fallback
    const fallback = requestedLensIds.map((id) => {
      try { return loadLens(id, root); } catch { return null; }
    }).filter(Boolean);
    if (fallback.length > 0) return fallback;
  }

  return available;
}

export function selectModelMemberForLens(lens, responsibility = 'chair') {
  if (lens.default_model_member) return lens.default_model_member;
  const resp = RESPONSIBILITY_DEFAULTS[responsibility] || RESPONSIBILITY_DEFAULTS.chair;
  return resp.default_member;
}

export function buildLensPrompt({ lens, responsibility, mission, context = {} }) {
  const respDefaults = RESPONSIBILITY_DEFAULTS[responsibility] || RESPONSIBILITY_DEFAULTS.chair;
  const lensProfile = [
    `Lens: ${lens.name} (${lens.lens_id})`,
    `Philosophy: ${lens.philosophy}`,
    `Strengths: ${(lens.strengths || []).join('; ')}`,
    `Blind spots: ${(lens.blind_spots || []).join('; ')}`,
    `Performs well: ${(lens.performs_well || []).join('; ')}`,
    `Performs poorly: ${(lens.performs_poorly || []).join('; ')}`,
    `Confidence: ${lens.confidence ?? 0.5}`,
    `Trust score: ${lens.trust_score ?? 0.5}`,
  ].join('\n');

  const disagreementSection = (lens.disagreement_profile || [])
    .map((d) => `- ${d.lens_id}: ${d.typical_conflict}`)
    .join('\n') || 'None declared.';

  const priorNotes = context.priorOutputs
    ? Object.entries(context.priorOutputs)
        .map(([key, value]) => `[${key}]\n${value}`)
        .join('\n\n')
    : 'No prior outputs yet.';

  const prompt = `You are acting as the "${responsibility.toUpperCase()}" responsibility in BuilderOS, using the following cognitive asset (lens).

${lensProfile}

Your purpose in this role: ${respDefaults.purpose}

MISSION:
"""${mission}"""

IMPORTANT: Keep Knowledge and Judgment separate.
- KNOWLEDGE = what you know: facts, evidence, references, constraints, things that are verifiable.
- JUDGMENT = what you conclude this lens recommends doing, based on that knowledge.

Do not let the following prior-lens judgments become your knowledge; they are other lenses' conclusions, included only so you can explicitly disagree with them if needed. Form your own answer from the mission and the lens profile first.

Prior lens judgments (NOT facts):
${priorNotes}

Known disagreements this lens typically has with other lenses:
${disagreementSection}

Respond in the voice of this lens. Be specific, concise, and honest about the limits of this perspective.

Output JSON exactly with these keys:
- "lens_id": "${lens.lens_id}"
- "responsibility": "${responsibility}"
- "summary": one-sentence position
- "position": a short paragraph (2-4 sentences)
- "knowledge": a list of 1-3 concrete facts or evidence items this lens is drawing on
- "judgment": a short paragraph (2-4 sentences) stating what this lens recommends doing
- "confidence": a number 0.0-1.0 representing how strongly this lens applies here
- "evidence": a list of 1-3 concrete reasons or references (may be the same as knowledge)
- "disagreements": a list of other lenses or responsibilities this lens would push back against and why
- "recommended_action": the single next thing to do from this perspective`;

  return prompt;
}

export function buildChairSynthesisPrompt({ mission, outputs }) {
  const summaries = outputs
    .map((o, idx) => `[${idx + 1}] ${o.responsibility}/${o.lens_id}: ${o.summary || 'No summary'} (confidence ${o.confidence ?? 'n/a'})`)
    .join('\n');

  const details = outputs
    .map((o) => `--- ${o.responsibility.toUpperCase()} / ${o.lens_id.toUpperCase()} ---\nPosition: ${o.position || 'n/a'}\nEvidence: ${(o.evidence || []).join('; ')}\nDisagreements: ${(o.disagreements || []).join('; ')}\nRecommended action: ${o.recommended_action || 'n/a'}`)
    .join('\n\n');

  return `You are the CHAIR in BuilderOS. Your job is not to eliminate disagreement but to understand and synthesize it.

MISSION:
"""${mission}"""

You have received independent outputs from these responsibilities and lenses:
${summaries}

Full outputs:
${details}

Produce a synthesis JSON with exactly these keys:
- "chair_position": the Chair's recommended decision or next action
- "tradeoffs": a list of key trade-offs named explicitly
- "named_disagreements": a list of specific disagreements between lenses that remain unresolved. Each item should include the two conflicting lens/responsibility ids and the issue.
- "why_this_wins": why the Chair's recommendation best serves the mission
- "confidence_by_lens": an object mapping "responsibility/lens_id" to the confidence number reported by that lens
- "propagated_confidence": a single number 0.0-1.0 for the Chair's overall confidence, reflecting the average minus a penalty for high spread or unresolved disagreement
- "limiting_factor": a one-sentence explanation of what most limits the Chair's confidence (e.g. "Security lens at 0.42 because auth scope is undefined")
- "unknowns": a list of things the Chair still does not know and must resolve before acting
- "assumptions": a list of assumptions the Chair is making to reach this recommendation
- "risks": what could go wrong
- "evidence_needed": a list of specific evidence needed to reduce unknowns
- "next_action": the single concrete next step`
}

export async function composeReasoning({
  mission,
  responsibilities = [],
  lenses = [],
  root = DEFAULT_ROOT,
  callModel = null,
  maxModelCalls = 20,
}) {
  if (!mission || typeof mission !== 'string') {
    throw new Error('Mission statement is required.');
  }

  const registry = loadLensRegistry(root);
  const resolvedResponsibilities = resolveResponsibilities(responsibilities);
  const outputs = [];
  let callCount = 0;

  for (const responsibility of resolvedResponsibilities) {
    const selected = selectLensesForResponsibility(responsibility, lenses, registry, root);

    for (const lens of selected) {
      const member = selectModelMemberForLens(lens, responsibility);
      const priorOutputs = outputs.reduce((acc, o) => {
        acc[`${o.responsibility}/${o.lens_id}`] = o.summary || o.position || '';
        return acc;
      }, {});

      const prompt = buildLensPrompt({ lens, responsibility, mission, context: { priorOutputs } });
      const base = {
        responsibility,
        lens_id: lens.lens_id,
        lens_name: lens.name,
        model_member: member,
        prompt,
        response: null,
        parsed: null,
        error: null,
        usage: null,
      };

      if (callModel) {
        if (callCount >= maxModelCalls) {
          base.error = 'Max model calls exceeded; dry-run for remaining lenses.';
          outputs.push(base);
          continue;
        }
        try {
          const result = await callModel({ member, prompt, options: { taskType: 'cognitive_chair.lens', returnObject: true, lens_id: lens.lens_id, responsibility } });
          base.response = result?.content ?? result?.text ?? null;
          base.usage = result?.usage ?? null;
          base.parsed = parseLensOutput(base.response);
          callCount += 1;
        } catch (err) {
          base.error = err.message;
        }
      }

      outputs.push(base);
    }
  }

  let chair = null;
  if (outputs.length > 0) {
    const parsedOutputs = outputs.map((o) => ({
      responsibility: o.responsibility,
      lens_id: o.lens_id,
      summary: o.parsed?.summary || o.response?.slice(0, 200) || '',
      position: o.parsed?.position || '',
      evidence: o.parsed?.evidence || [],
      disagreements: o.parsed?.disagreements || [],
      confidence: o.parsed?.confidence ?? null,
      recommended_action: o.parsed?.recommended_action || '',
    }));

    const synthesisPrompt = buildChairSynthesisPrompt({ mission, outputs: parsedOutputs });
    if (callModel && callCount < maxModelCalls) {
      try {
        const result = await callModel({
          member: 'claude_sonnet',
          prompt: synthesisPrompt,
          options: { taskType: 'cognitive_chair.synthesis', returnObject: true, lens_id: 'chair_synthesis', responsibility: 'chair' },
        });
        callCount += 1;
        chair = {
          prompt: synthesisPrompt,
          response: result?.content ?? result?.text ?? null,
          parsed: parseChairOutput(result?.content ?? result?.text ?? ''),
          usage: result?.usage ?? null,
          error: null,
        };
      } catch (err) {
        chair = { prompt: synthesisPrompt, response: null, parsed: null, usage: null, error: err.message };
      }
    } else {
      chair = { prompt: synthesisPrompt, response: null, parsed: null, usage: null, error: null };
    }
  }

  return {
    mission,
    responsibilities: resolvedResponsibilities,
    requested_lenses: lenses,
    model_calls_used: callCount,
    dry_run: !callModel,
    outputs,
    chair,
  };
}

function parseLensOutput(text) {
  if (!text) return null;
  const cleaned = text.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, cleaned];
  const payload = jsonMatch[1] || cleaned;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function parseChairOutput(text) {
  if (!text) return null;
  const cleaned = text.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, cleaned];
  const payload = jsonMatch[1] || cleaned;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function formatTranscript(transcript) {
  const lines = [
    `# Cognitive Chair Transcript`,
    `Mission: ${transcript.mission}`,
    `Responsibilities: ${transcript.responsibilities.join(', ')}`,
    `Requested lenses: ${(transcript.requested_lenses || []).join(', ') || 'all available'}`,
    `Dry run: ${transcript.dry_run}`,
    `Model calls used: ${transcript.model_calls_used}`,
    '',
    `## Lens outputs`,
  ];

  for (const o of transcript.outputs) {
    lines.push(`### ${o.responsibility} / ${o.lens_id} (${o.lens_name})`);
    lines.push(`Model: ${o.model_member}`);
    if (o.error) lines.push(`Error: ${o.error}`);
    if (o.parsed) {
      lines.push(`Summary: ${o.parsed.summary || ''}`);
      lines.push(`Position: ${o.parsed.position || ''}`);
      lines.push(`Knowledge: ${(o.parsed.knowledge || []).join('; ')}`);
      lines.push(`Judgment: ${o.parsed.judgment || ''}`);
      lines.push(`Confidence: ${o.parsed.confidence ?? ''}`);
      lines.push(`Evidence: ${(o.parsed.evidence || []).join('; ')}`);
      lines.push(`Disagreements: ${(o.parsed.disagreements || []).join('; ')}`);
      lines.push(`Recommended action: ${o.parsed.recommended_action || ''}`);
    } else if (o.response) {
      lines.push(`Response: ${o.response.slice(0, 500)}`);
    } else {
      lines.push(`(dry-run; prompt generated)`);
    }
    lines.push('');
  }

  if (transcript.chair) {
    lines.push('## Chair synthesis');
    if (transcript.chair.error) lines.push(`Error: ${transcript.chair.error}`);
    if (transcript.chair.parsed) {
      lines.push(`Position: ${transcript.chair.parsed.chair_position || ''}`);
      lines.push(`Tradeoffs: ${(transcript.chair.parsed.tradeoffs || []).join('; ')}`);
      lines.push(`Named disagreements: ${(transcript.chair.parsed.named_disagreements || []).join('; ')}`);
      lines.push(`Why this wins: ${transcript.chair.parsed.why_this_wins || ''}`);
      lines.push(`Propagated confidence: ${transcript.chair.parsed.propagated_confidence ?? ''}`);
      lines.push(`Limiting factor: ${transcript.chair.parsed.limiting_factor || ''}`);
      lines.push(`Unknowns: ${(transcript.chair.parsed.unknowns || []).join('; ')}`);
      lines.push(`Assumptions: ${(transcript.chair.parsed.assumptions || []).join('; ')}`);
      lines.push(`Evidence needed: ${(transcript.chair.parsed.evidence_needed || []).join('; ')}`);
      lines.push(`Risks: ${(transcript.chair.parsed.risks || []).join('; ')}`);
      lines.push(`Next action: ${transcript.chair.parsed.next_action || ''}`);
    } else if (transcript.chair.response) {
      lines.push(transcript.chair.response.slice(0, 1000));
    } else {
      lines.push('(dry-run; synthesis prompt generated)');
    }
  }

  return lines.join('\n');
}
