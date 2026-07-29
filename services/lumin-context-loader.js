/**
 * SYNOPSIS: Loads per-user twin + communication profile + recent learning for Lumin prompts.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCommunicationProfile } from './communication-profile.js';
import { createLifeRETwinStore } from './lifere-twin-store.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CORE_KEYS = [
  '_meta',
  'personal',
  'personality',
  'communication',
  'goal',
  'operating_system',
  'decision_identity',
  'permission',
  'memory',
];

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function fieldValue(v) {
  if (v == null) return null;
  if (typeof v === 'object' && !Array.isArray(v) && 'value' in v) return v.value;
  return v;
}

function twinDir(userHandle) {
  return path.join(ROOT, 'data/twins/default', userHandle);
}

function loadFacetFromDisk(userHandle, twinKey) {
  return readJsonSafe(path.join(twinDir(userHandle), `${twinKey}.json`));
}

function loadModuleFromDisk(userHandle, moduleKey) {
  return readJsonSafe(path.join(twinDir(userHandle), 'modules', `${moduleKey}.json`));
}

function listModuleKeys(userHandle) {
  const dir = path.join(twinDir(userHandle), 'modules');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
}

function formatDecisionLayer(layers, layerName, max = 4) {
  const items = layers?.[layerName];
  if (!Array.isArray(items) || !items.length) return null;
  const lines = items.slice(0, max).map((p) => `- ${p.pattern_text}`);
  return `${layerName.toUpperCase()}:\n${lines.join('\n')}`;
}

const FOUNDER_TWIN_REQUIRED = ['_meta', 'personal', 'goal', 'operating_system', 'decision_identity'];
const DECISION_SIGNAL_RE =
  /\b(i (decided|decide|want|will|need|chose|choose)|from now on|locked|lock it|no longer|never |always |my goal|don't want|do not want|both\.|hard.?gate)\b/i;

export function isFounderTwinHardGated(userHandle = 'adam') {
  if (process.env.TWIN_HARD_GATE === '0' || /^false$/i.test(String(process.env.TWIN_HARD_GATE || ''))) {
    return false;
  }
  const h = String(userHandle || 'adam').toLowerCase();
  return h === 'adam' || h === 'founder';
}

export function evaluateTwinGate(bundle, injectText = '') {
  const missing = FOUNDER_TWIN_REQUIRED.filter((k) => !bundle?.[k]);
  const status = bundle?._meta?.status || null;
  const statusOk = status === 'active' || status === 'review';
  const inject = String(injectText || '');
  const injectOk = inject.includes('DIGITAL TWIN') && inject.length >= 400;
  const ok = missing.length === 0 && statusOk && injectOk;
  let reason = 'ok';
  if (missing.length) reason = `missing facets: ${missing.join(', ')}`;
  else if (!statusOk) reason = `twin status not ready (${status || 'null'})`;
  else if (!injectOk) reason = 'twin inject block missing or too thin';
  return {
    ok,
    reason,
    missing,
    status,
    inject_chars: inject.length,
    hard_gated: true,
  };
}

function looksLikeDecision(text = '') {
  const t = String(text || '').trim();
  if (t.length < 24) return false;
  return DECISION_SIGNAL_RE.test(t);
}

function normalizePatternKey(text = '') {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 160);
}

/**
 * Learn from a founder message into facet twin files (memory + decision_identity).
 * Deterministic — no model required. Does not overwrite VERIFIED locks.
 */
export async function learnFromFounderMessage({
  userHandle = 'adam',
  messageText,
  source = 'chair',
  pool = null,
  logger = console,
} = {}) {
  const text = String(messageText || '').trim();
  if (!text || text.length < 12) {
    return { learned: false, reason: 'too_short' };
  }

  const store = createLifeRETwinStore({ pool, logger });
  const now = new Date().toISOString();
  const receipt = { source, at: now, quote: text.slice(0, 280) };
  const writes = [];

  const memory = store.readTwin({ tenantId: 'default', userId: userHandle, twinKey: 'memory' }) || {
    schema: 'digital_twin_memory_v1',
    capsule_refs: [],
    digest_refs: [],
    episodic_summaries: [],
    do_not_ingest: [],
  };
  const episodes = Array.isArray(memory.episodic_summaries) ? [...memory.episodic_summaries] : [];
  episodes.push({
    at: now,
    summary: text.slice(0, 400),
    evidence_level: 'CLAIM',
    source,
  });
  memory.episodic_summaries = episodes.slice(-50);
  memory.updated_at = now;
  await store.writeTwin({
    tenantId: 'default',
    userId: userHandle,
    twinKey: 'memory',
    payload: memory,
    receiptMeta: receipt,
  });
  writes.push('memory');

  let decisionLearned = false;
  if (looksLikeDecision(text)) {
    const decision = store.readTwin({
      tenantId: 'default',
      userId: userHandle,
      twinKey: 'decision_identity',
    }) || {
      schema: 'digital_twin_decision_identity_v1',
      layers: { values: [], vetoes: [], heuristics: [], escalation: [], precedents: [], presentation: [] },
      compiler_status: 'live_learn',
    };
    if (!decision.layers) decision.layers = {};
    if (!Array.isArray(decision.layers.heuristics)) decision.layers.heuristics = [];
    const patternText = text.length > 220 ? `${text.slice(0, 217)}…` : text;
    const key = normalizePatternKey(patternText);
    const exists = decision.layers.heuristics.some(
      (h) => normalizePatternKey(h.pattern_text || '') === key,
    );
    if (!exists) {
      decision.layers.heuristics.push({
        pattern_text: patternText,
        evidence_level: 'CLAIM',
        source_ref: `${source}:${now}`,
        applies_when: 'live founder conversation',
        learned_at: now,
      });
      decision.layers.heuristics = decision.layers.heuristics.slice(-40);
      decision.compiler_status = 'live_learn';
      decision.updated_at = now;
      await store.writeTwin({
        tenantId: 'default',
        userId: userHandle,
        twinKey: 'decision_identity',
        payload: decision,
        receiptMeta: receipt,
      });
      writes.push('decision_identity');
      decisionLearned = true;
    }
  }

  const meta = store.readTwin({ tenantId: 'default', userId: userHandle, twinKey: '_meta' });
  if (meta) {
    meta.last_learned_at = now;
    meta.last_learned_source = source;
    meta.updated_at = now;
    if (!meta.supervision) meta.supervision = {};
    meta.supervision.last_learned_at = now;
    await store.writeTwin({
      tenantId: 'default',
      userId: userHandle,
      twinKey: '_meta',
      payload: meta,
      receiptMeta: receipt,
    });
    writes.push('_meta');
  }

  return {
    learned: true,
    decision_learned: decisionLearned,
    writes,
    at: now,
  };
}

function formatTwinInjectBlock(bundle, { maxChars = 7000 } = {}) {
  if (!bundle) return '';
  const parts = [];
  const meta = bundle._meta;
  const personal = bundle.personal;
  const goal = bundle.goal;
  const os = bundle.operating_system;
  const decision = bundle.decision_identity;
  const communication = bundle.communication;
  const personality = bundle.personality;

  if (meta) {
    parts.push(
      `DIGITAL TWIN (${meta.display_name || bundle.userHandle || 'user'}) ` +
      `status=${meta.status || 'unknown'} template=${meta.template_version || '?'}`
    );
    if (meta.transparency_doctrine?.text) {
      parts.push(`TRANSPARENCY: ${meta.transparency_doctrine.text}`);
    }
  }

  if (personal) {
    const tz = fieldValue(personal.timezone);
    const lines = [
      `Name: ${personal.name || bundle.userHandle}`,
      tz ? `Timezone: ${tz}` : null,
      personal.roles?.length ? `Roles: ${personal.roles.join(', ')}` : null,
      personal.superpowers?.length ? `Superpowers: ${personal.superpowers.join(', ')}` : null,
      personal.demotivators?.length ? `Demotivators: ${personal.demotivators.slice(0, 6).join('; ')}` : null,
      personal.unwanted_busywork?.length
        ? `Busywork to offload: ${personal.unwanted_busywork.slice(0, 6).join('; ')}`
        : null,
      personal.coaching_tolerance ? `Coaching tolerance: ${personal.coaching_tolerance}` : null,
      personal.energy_pattern
        ? `Energy: ${typeof personal.energy_pattern === 'string' ? personal.energy_pattern : personal.energy_pattern.value || ''}`
        : null,
    ].filter(Boolean);
    if (lines.length) parts.push(`PERSONAL:\n${lines.join('\n')}`);
    if (personal.whys?.length) {
      const whys = personal.whys
        .slice(0, 5)
        .map((w) => `- ${w.label}: ${w.story || w.feeling || ''}`)
        .join('\n');
      parts.push(`WHYS:\n${whys}`);
    }
  }

  if (goal?.active_targets) {
    const t = goal.active_targets;
    const lines = [];
    if (t.income_personal_takehome_monthly_usd) {
      lines.push(`Personal take-home: $${t.income_personal_takehome_monthly_usd.value}/mo (first gate)`);
    }
    if (t.income_company_monthly_usd) {
      lines.push(`Company goal: $${t.income_company_monthly_usd.value}/mo`);
    }
    if (t.weight_lbs) {
      const w = t.weight_lbs;
      lines.push(
        `Weight: current ${w.current ?? '?'} → target below ${w.target ?? w.value ?? '?'}`
      );
    }
    if (t.content_videos_per_week?.value != null) {
      lines.push(`Videos/week min: ${t.content_videos_per_week.value}`);
    }
    if (t.appointments_per_day?.value != null) {
      lines.push(`Appointments/day: ${t.appointments_per_day.value}`);
    }
    if (t.recruiting?.value) lines.push(`Recruiting: ${t.recruiting.value}`);
    if (lines.length) parts.push(`GOALS:\n${lines.join('\n')}`);
  }

  if (os) {
    const wake = os.wake;
    if (wake) {
      const window = wake.current_window
        ? `${wake.current_window.earliest}–${wake.current_window.latest}`
        : 'unknown';
      parts.push(
        `WAKE: current ${window} (transitional — not permanent). ` +
        `Direction: earlier. Exception: late wake OK only if up late. ` +
        `Aspirational: ${wake.aspirational || 'n/a'}.`
      );
    }
    if (os.mantra) parts.push(`MANTRA: ${os.mantra}`);
    if (os.accountability?.partner) {
      parts.push(
        `ACCOUNTABILITY: ${os.accountability.partner} — ${(os.accountability.daily || []).join('; ')}`
      );
    }
    if (os.priority_abc?.A?.length) {
      parts.push(`A-TIER TODAY:\n${os.priority_abc.A.slice(0, 8).map((x) => `- ${x}`).join('\n')}`);
    }
    if (os.weekly_quotas?.youtube) {
      const y = os.weekly_quotas.youtube;
      parts.push(`CONTENT QUOTA: ${y.minimum || y.value} videos/week`);
    }
  }

  if (decision?.layers) {
    for (const layer of ['values', 'vetoes', 'heuristics', 'presentation']) {
      const block = formatDecisionLayer(decision.layers, layer, layer === 'heuristics' ? 6 : 4);
      if (block) parts.push(block);
    }
  }

  if (communication) {
    const lines = [
      communication.how_to_address ? `Address: ${communication.how_to_address}` : null,
      communication.packet_preference ? `Packets: ${communication.packet_preference}` : null,
      communication.story_style ? `Story style: ${communication.story_style}` : null,
      communication.banned_phrases?.length
        ? `Banned phrases: ${communication.banned_phrases.slice(0, 5).join('; ')}`
        : null,
    ].filter(Boolean);
    if (lines.length) parts.push(`COMMUNICATION:\n${lines.join('\n')}`);
  }

  if (personality) {
    parts.push(
      `PERSONALITY dials: directness=${personality.directness ?? '?'} ` +
      `warmth=${personality.warmth ?? '?'} humor=${personality.humor ?? '?'}`
    );
  }

  const moduleSummaries = [];
  for (const [key, mod] of Object.entries(bundle.modules || {})) {
    if (!mod) continue;
    if (key === 'gvbn' && mod.offer) {
      moduleSummaries.push(
        `GVBN: ${mod.offer.pricing || mod.offer.pricing_status} — ${mod.offer.one_liner || ''}`
      );
    } else if (key === 'content' && (mod.cadence || mod.cadence_candidates)) {
      const c = mod.cadence || {};
      moduleSummaries.push(`Content: ${c.minimum || c.videos_per_week || '?'} videos/week min`);
    } else if (key === 'recruiting' && mod.quotas) {
      moduleSummaries.push(
        `Recruiting: ${mod.quotas.new_calls_hours_per_day}h new + ${mod.quotas.follow_up_hours_per_day}h follow-up × ${mod.quotas.days_per_week}d`
      );
    }
  }
  if (moduleSummaries.length) parts.push(`MODULES:\n${moduleSummaries.map((s) => `- ${s}`).join('\n')}`);

  parts.push(
    'RULES: Do not invent personal facts missing from this twin. ' +
    'Do not treat aspirational schedule as current. ' +
    'Do not claim prediction-as-decision. Label uncertainty.'
  );

  let text = parts.filter(Boolean).join('\n\n');
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}\n\n[twin inject truncated]`;
  }
  return text;
}

export function createLuminContextLoader({ pool, callAI = null, logger = console }) {
  const twinStore = createLifeRETwinStore({ pool, logger });
  const commProfile = pool ? createCommunicationProfile({ pool, callAI, logger }) : null;

  function readFacet(userHandle, twinKey) {
    const fromStore = twinStore.readTwin({ tenantId: 'default', userId: userHandle, twinKey });
    if (fromStore) return fromStore;
    return loadFacetFromDisk(userHandle, twinKey);
  }

  function readModule(userHandle, moduleKey) {
    const fromStore = twinStore.readTwin({
      tenantId: 'default',
      userId: userHandle,
      moduleKey,
    });
    if (fromStore) return fromStore;
    return loadModuleFromDisk(userHandle, moduleKey);
  }

  async function loadPersonalTwin(userHandle = 'adam') {
    return readFacet(userHandle, 'personal');
  }

  async function loadFullTwin(userHandle = 'adam') {
    const facets = {};
    for (const key of CORE_KEYS) {
      facets[key] = readFacet(userHandle, key);
    }
    const modules = {};
    for (const modKey of listModuleKeys(userHandle)) {
      modules[modKey] = readModule(userHandle, modKey);
    }
    const present = CORE_KEYS.filter((k) => facets[k] != null);
    return {
      userHandle,
      ...facets,
      modules,
      present_facets: present,
      module_keys: Object.keys(modules),
      loaded_at: new Date().toISOString(),
    };
  }

  async function getTwinInjectBlock(userHandle = 'adam', opts = {}) {
    const bundle = await loadFullTwin(userHandle);
    if (!bundle.personal && !bundle._meta) return '';
    return formatTwinInjectBlock(bundle, opts);
  }

  async function getTwinGate(userHandle = 'adam') {
    const bundle = await loadFullTwin(userHandle);
    const inject = formatTwinInjectBlock(bundle);
    return {
      ...evaluateTwinGate(bundle, inject),
      hard_gated_for_user: isFounderTwinHardGated(userHandle),
      inject_preview: inject.slice(0, 180),
    };
  }

  async function requireTwinOrThrow(userHandle = 'adam') {
    const gate = await getTwinGate(userHandle);
    if (isFounderTwinHardGated(userHandle) && !gate.ok) {
      const err = new Error(`TWIN_GATE_FAILED: ${gate.reason}`);
      err.code = 'TWIN_GATE_FAILED';
      err.twin_gate = gate;
      throw err;
    }
    return gate;
  }

  async function loadRecentLessons(limit = 6) {
    if (!pool) return [];
    const { rows } = await pool.query(
      `SELECT problem, solution, tags, created_at
         FROM lessons_learned
        WHERE domain = 'coaching' OR 'coaching' = ANY(tags)
        ORDER BY created_at DESC
        LIMIT $1`,
      [Math.max(1, Math.min(20, limit))],
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function loadRecentMoments(userId, limit = 5) {
    if (!pool || !userId) return [];
    const { rows } = await pool.query(
      `SELECT clip_type, title, body, tags, created_at
         FROM lumin_moment_clips
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, Math.max(1, Math.min(20, limit))],
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function loadPendingContactUpdates(userId, limit = 8) {
    if (!pool || !userId) return [];
    const { rows } = await pool.query(
      `SELECT contact_name, field_name, field_value, context_note, created_at
         FROM lumin_contact_update_queue
        WHERE user_id = $1 AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, limit],
    ).catch(() => ({ rows: [] }));
    return rows;
  }

  async function buildPromptContext({ userId = null, userHandle = 'adam' } = {}) {
    const parts = [];

    const twinBlock = await getTwinInjectBlock(userHandle);
    if (twinBlock) parts.push(twinBlock);

    if (commProfile && userId) {
      const profileBlock = await commProfile.getProfileForPrompt(userId).catch(() => '');
      if (profileBlock) parts.push(`HOW TO TALK TO THIS USER:\n${profileBlock}`);
    }

    const lessons = await loadRecentLessons(5);
    if (lessons.length) {
      parts.push(`RECENT LESSONS (from their conversations):\n${lessons.map((l) => `- ${l.problem} → ${l.solution}`).join('\n')}`);
    }

    if (userId) {
      const moments = await loadRecentMoments(userId, 4);
      if (moments.length) {
        parts.push(`CAPTURED MOMENTS:\n${moments.map((m) => `- [${m.clip_type}] ${m.title}`).join('\n')}`);
      }
      const contacts = await loadPendingContactUpdates(userId, 5);
      if (contacts.length) {
        parts.push(`PENDING CONTACT UPDATES (from overheard conversations):\n${contacts.map((c) => `- ${c.contact_name}: ${c.field_name} = ${c.field_value}`).join('\n')}`);
      }
    }

    try {
      const raw = readJsonSafe(path.join(ROOT, 'data/memories.json'));
      const doctrineFacts = (raw?.facts || [])
        .filter((f) => ['lumin_doctrine', 'lumin_doctrine_wisdom', 'founder_directive'].includes(f?.content?.type))
        .slice(0, 2)
        .map((f) => String(f?.content?.content || '').slice(0, 600))
        .filter(Boolean);
      if (doctrineFacts.length) parts.push(`DOCTRINE:\n${doctrineFacts.join('\n---\n')}`);
    } catch { /* non-fatal */ }

    return parts.filter(Boolean).join('\n\n');
  }

  return {
    buildPromptContext,
    loadPersonalTwin,
    loadFullTwin,
    getTwinInjectBlock,
    getTwinGate,
    requireTwinOrThrow,
    formatTwinInjectBlock,
    loadRecentLessons,
    loadRecentMoments,
    loadPendingContactUpdates,
  };
}

export { formatTwinInjectBlock, fieldValue, CORE_KEYS };