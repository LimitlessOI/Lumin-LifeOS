/**
 * SYNOPSIS: Service module — Lifeos Ui Directives.
 */
import { z } from 'zod';

const userIdSchema = z.union([z.string().min(1), z.number().int().positive()]);
const directiveTextSchema = z.string().trim().min(1);

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9\s,'"-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

function parsePins(text) {
  const pins = [];
  const lowered = normalizeText(text);

  const pinPatterns = [
    /\bpin(?:\s+(?:these|this|the))?\s+([^.;:]+?)(?=(?:\s+\b(?:and|with|for|to|in|on|at|plus)\b|\s*[.;:]|$))/g,
    /\bfocus(?:\s+on)?\s+([^.;:]+?)(?=(?:\s+\b(?:and|with|for|to|in|on|at|plus)\b|\s*[.;:]|$))/g,
    /\bkeep(?:\s+it)?\s+([^.;:]+?)(?=(?:\s+\b(?:and|with|for|to|in|on|at|plus)\b|\s*[.;:]|$))/g,
    /\bshow\s+([^.;:]+?)(?=(?:\s+\b(?:and|with|for|to|in|on|at|plus)\b|\s*[.;:]|$))/g,
  ];

  for (const re of pinPatterns) {
    let match;
    while ((match = re.exec(lowered))) {
      const raw = match[1].replace(/\b(?:the|a|an)\b/g, ' ').trim();
      if (raw) pins.push(raw);
    }
  }

  const explicitTokens = lowered.match(
    /\b(?:calendar|tasks?|notes?|messages?|inbox|overview|dashboard|timeline|habits?|goals?|metrics?|health|finance|relationships?|projects?|focus|today|week|month)\b/g
  );
  if (explicitTokens) pins.push(...explicitTokens);

  return uniqueList(
    pins
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .map((p) => p.replace(/^(?:the|a|an)\s+/g, ''))
      .filter(Boolean)
  );
}

function parseLayout(text) {
  const t = normalizeText(text);
  const rules = [
    [/\b(two[-\s]?column|2[-\s]?column|split view|split-screen)\b/, 'two-column'],
    [/\b(single[-\s]?column|minimal|clean|simple)\b/, 'single-column'],
    [/\b(cards?|card layout|tile|grid)\b/, 'grid'],
    [/\bsidebar\b/, 'sidebar'],
    [/\bstack(ed)?\b/, 'stacked'],
  ];
  for (const [re, value] of rules) {
    if (re.test(t)) return value;
  }
  return undefined;
}

function parseModuleOrder(text) {
  const t = normalizeText(text);
  const candidates = [];

  const orderKeywords = [
    'today',
    'calendar',
    'tasks',
    'inbox',
    'messages',
    'notes',
    'goals',
    'habits',
    'health',
    'finance',
    'relationships',
    'projects',
    'overview',
    'metrics',
  ];

  const phraseMatch = t.match(
    /\b(?:order|sequence|priority|prioritize|put|show|stack|arrange)\b([^.;:]+?)(?=(?:[.;:]|$))/g
  );

  if (phraseMatch) {
    for (const phrase of phraseMatch) {
      for (const k of orderKeywords) {
        if (phrase.includes(k)) candidates.push(k);
      }
    }
  }

  for (const k of orderKeywords) {
    if (new RegExp(`\\b${k}\\b`).test(t)) candidates.push(k);
  }

  return uniqueList(candidates);
}

function parseTone(text) {
  const t = normalizeText(text);
  const toneMap = [
    [/\b(friendly|warm|gentle|soft)\b/, 'warm'],
    [/\b(minimal|quiet|calm|zen|serene)\b/, 'calm'],
    [/\b(energetic|bold|lively|vibrant)\b/, 'energetic'],
    [/\b(professional|formal|serious)\b/, 'professional'],
    [/\b(playful|fun|light)\b/, 'playful'],
  ];
  for (const [re, tone] of toneMap) {
    if (re.test(t)) return tone;
  }
  return undefined;
}

function parseDirectiveText(text) {
  const input = String(text ?? '');
  const normalized = normalizeText(input);
  const result = {};

  const pins = parsePins(input);
  const layout = parseLayout(input);
  const module_order = parseModuleOrder(input);
  const tone = parseTone(input);

  if (pins.length) result.pins = pins;
  if (layout) result.layout = layout;
  if (module_order.length) result.module_order = module_order;
  if (tone) result.tone = tone;

  return result;
}

function createUiDirectivesService({ pool }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('createUiDirectivesService requires a pg pool');
  }

  async function getDirectives(userId) {
    const parsed = userIdSchema.safeParse(userId);
    if (!parsed.success) {
      throw new Error('Invalid userId');
    }

    const { rows } = await pool.query(
      'SELECT flourishing_prefs FROM lifeos_users WHERE id = $1 LIMIT 1',
      [parsed.data]
    );

    const prefs = rows[0]?.flourishing_prefs;
    const uiDirectives = prefs && typeof prefs === 'object' ? prefs.ui_directives : undefined;
    return uiDirectives && typeof uiDirectives === 'object' ? uiDirectives : {};
  }

  async function proposeDirectives({ userId, text }) {
    const parsedUserId = userIdSchema.safeParse(userId);
    const parsedText = directiveTextSchema.safeParse(text);
    if (!parsedUserId.success) throw new Error('Invalid userId');
    if (!parsedText.success) throw new Error('Invalid text');

    return {
      proposed: parseDirectiveText(parsedText.data),
      needs_confirm: true,
    };
  }

  async function applyDirectives({ userId, directives }) {
    const parsedUserId = userIdSchema.safeParse(userId);
    if (!parsedUserId.success) throw new Error('Invalid userId');
    if (!directives || typeof directives !== 'object' || Array.isArray(directives)) {
      throw new Error('Invalid directives');
    }

    const { rows } = await pool.query(
      `
      UPDATE lifeos_users
      SET flourishing_prefs = COALESCE(flourishing_prefs, '{}'::jsonb)
        || jsonb_build_object('ui_directives', COALESCE(flourishing_prefs->'ui_directives', '{}'::jsonb) || $2::jsonb),
          updated_at = NOW()
      WHERE id = $1
      RETURNING flourishing_prefs
      `,
      [parsedUserId.data, JSON.stringify(directives)]
    );

    const prefs = rows[0]?.flourishing_prefs;
    return prefs && typeof prefs === 'object' ? prefs : {};
  }

  return {
    parseDirectiveText,
    proposeDirectives,
    applyDirectives,
    getDirectives,
  };
}

export { createUiDirectivesService, parseDirectiveText };