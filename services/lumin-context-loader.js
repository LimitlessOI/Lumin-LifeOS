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

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function createLuminContextLoader({ pool, callAI = null, logger = console }) {
  const twinStore = createLifeRETwinStore({ pool, logger });
  const commProfile = pool ? createCommunicationProfile({ pool, callAI, logger }) : null;

  async function loadPersonalTwin(userHandle = 'adam') {
    const fromStore = twinStore.readTwin({ tenantId: 'default', userId: userHandle, twinKey: 'personal' });
    if (fromStore) return fromStore;
    return readJsonSafe(path.join(ROOT, 'data/twins/default', userHandle, 'personal.json'));
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
    const personal = await loadPersonalTwin(userHandle);
    if (personal) {
      const lines = [
        `Name: ${personal.name || userHandle}`,
        personal.timezone ? `Timezone: ${personal.timezone}` : null,
        personal.superpowers?.length ? `Superpowers: ${personal.superpowers.join(', ')}` : null,
        personal.demotivators?.length ? `Demotivators (never do): ${personal.demotivators.join(', ')}` : null,
        personal.unwanted_busywork?.length ? `Wants Lumin to handle (not Adam): ${personal.unwanted_busywork.join(', ')}` : null,
        personal.coaching_tolerance ? `Coaching tolerance: ${personal.coaching_tolerance}` : null,
      ].filter(Boolean);
      if (lines.length) parts.push(`PERSONAL TWIN:\n${lines.join('\n')}`);
      if (personal.whys?.length) {
        const whys = personal.whys.slice(0, 3).map((w) => `- ${w.label}: ${w.story || w.feeling || ''}`).join('\n');
        parts.push(`WHY (emotional north):\n${whys}`);
      }
    }

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
    loadRecentLessons,
    loadRecentMoments,
    loadPendingContactUpdates,
  };
}
