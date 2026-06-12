/**
 * Founder Voice Rail — preference capture + session routing memory.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { normalizeSignal, writeSignalIntakeReceipt } from './memory-signal-intake.js';
import { createCandidate } from './memory-candidate.js';
import { createCapsule } from './memory-capsule.js';

const PREFERENCE_RULES = [
  { id: 'anti_fluff', re: /\b(too fluffy|stop being fluffy|less fluff|no fluff|too wordy|too long|rambling|get to the point)\b/i },
  { id: 'anti_formal', re: /\b(too formal|stop being formal|too stiff|corporate speak|don'?t talk like that)\b/i },
  { id: 'want_direct', re: /\b(be direct|talk straight|cut the crap|just tell me|no bullshit)\b/i },
  { id: 'want_warmth', re: /\b(too cold|more human|warm it up|softer|less harsh)\b/i },
  { id: 'dislike_style', re: /\b(don'?t like (how|that)|i hate when you|stop (saying|doing)|never (say|do) that again)\b/i },
];

const ESCALATION_ASK = /\b(go deeper|think harder|use (your )?best model|need a better answer|not good enough|try again|really need to know|dig in)\b/i;

export function detectFounderPreferenceSignal(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  for (const rule of PREFERENCE_RULES) {
    if (rule.re.test(raw)) return { type: rule.id, excerpt: raw.slice(0, 500) };
  }
  return null;
}

export function detectEscalationAsk(text) {
  return ESCALATION_ASK.test(String(text || ''));
}

export function detectShallowCouncilReply(reply, userContent) {
  const r = String(reply || '').trim();
  const u = String(userContent || '').trim();
  if (!r || r.length < 40) return true;
  if (u.length > 400 && r.length < 120) return true;
  if (/\b(I don't have access|as an AI language model|I cannot browse|no memory across sessions)\b/i.test(r)) {
    return true;
  }
  return false;
}

export async function getSessionRoutingState(pool, sessionId) {
  if (!sessionId) return { tier_boost: 0, last_tier: 0 };
  const { rows } = await pool.query(
    `SELECT founder_routing_state FROM voice_rail_sessions WHERE id = $1 LIMIT 1`,
    [sessionId],
  );
  const st = rows[0]?.founder_routing_state || {};
  return {
    tier_boost: Number(st.tier_boost) || 0,
    last_tier: Number(st.last_tier) || 0,
  };
}

export async function saveSessionRoutingState(pool, sessionId, { tier_boost, last_tier }) {
  if (!sessionId) return;
  await pool.query(
    `UPDATE voice_rail_sessions
        SET founder_routing_state = COALESCE(founder_routing_state, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
      WHERE id = $1`,
    [
      sessionId,
      JSON.stringify({
        tier_boost: Math.min(Math.max(Number(tier_boost) || 0, 0), 3),
        last_tier: Number(last_tier) || 0,
        updated_at: new Date().toISOString(),
      }),
    ],
  );
}

export async function persistFounderPreferenceSignal({
  pool,
  userId,
  sessionId,
  content,
  communicationProfile,
  logger,
}) {
  const hit = detectFounderPreferenceSignal(content);
  if (!hit || !pool) return null;

  try {
    const signal = await normalizeSignal(
      {
        source_type: 'founder_input',
        signal_type: 'preference',
        content: `Founder communication preference (${hit.type}): ${hit.excerpt}`,
        domain: 'founder_comms',
      },
      { pool },
    );
    await writeSignalIntakeReceipt(signal, pool);
    const candidate = await createCandidate({ ...signal, domain: 'founder_comms' }, pool);
    if (!candidate.deduplicated) {
      await createCapsule(
        candidate,
        {
          title: `Founder comms: ${hit.type}`.slice(0, 100),
          capsule_type: 'preference',
          truth_class: 'preference',
          source_type: 'founder_input',
          task_scope: 'voice_rail_founder',
        },
        pool,
      );
    }

    await pool.query(
      `UPDATE communication_profiles
          SET profile_summary = TRIM(BOTH FROM COALESCE(profile_summary, '') || $2),
              updated_at = NOW()
        WHERE user_id = $1`,
      [userId, `\n[Voice Rail ${new Date().toISOString().slice(0, 10)}] ${hit.excerpt}`],
    );

    if (communicationProfile?.recordEngagement) {
      await communicationProfile.recordEngagement({
        userId,
        sessionId,
        context: 'voice_rail_founder_correction',
        styles: {
          opening: 'direct',
          length: hit.type === 'anti_fluff' ? 'short' : 'medium',
          tone: hit.type === 'anti_formal' ? 'matter_of_fact' : 'warm_direct',
          question_ending: 'no_question',
        },
        contextAtTime: {},
        engagementSignal: 'session_ended_early',
        responseLength: 0,
      });
    }

    return { ok: true, preference_type: hit.type };
  } catch (err) {
    logger?.warn?.({ err: err.message, halt: err.halt_code }, 'voice-rail preference persist failed');
    return { ok: false, error: err.message, halt_code: err.halt_code };
  }
}

export function filterCapsulesForDepartment(capsules, deptId) {
  const dept = String(deptId || 'ChC');
  const list = Array.isArray(capsules) ? capsules : [];
  const scoped = list.filter((c) => {
    const scope = String(c.task_scope || '').toLowerCase();
    const title = String(c.title || '').toLowerCase();
    if (scope === 'voice_rail_founder' || scope === 'founder_comms') return true;
    if (title.includes(dept.toLowerCase())) return true;
    if (dept === 'CFO' && /cost|spend|roi|token/.test(title)) return true;
    if (dept === 'Hist' && /history|ledger|receipt|lesson/.test(title)) return true;
    return false;
  });
  return scoped.length ? scoped : list.slice(0, 8);
}
