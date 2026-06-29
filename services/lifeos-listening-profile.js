/**
 * SYNOPSIS: Listening Profile — opt-in ambient, capture, family guard, schedule prefs for Lumen onboarding.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

export const DEFAULT_LISTENING_PROFILE = {
  master_enabled: false,
  onboarding_completed: false,
  mode: 'off',
  wake_word: 'lumen',
  schedule: {
    enabled: false,
    start: '06:00',
    end: '18:00',
    timezone: 'America/Los_Angeles',
  },
  evening_conflict_only: {
    enabled: false,
    after: '18:00',
  },
  capture: {
    audio_clips_local: false,
    conflict_clips: false,
    win_clips: false,
    transcripts_to_server: false,
  },
  family_guard: {
    vibrate_on_yell: false,
    vibrate_on_snippy: true,
    offer_mediation: false,
    speak_mediation_offer: false,
  },
  privacy: {
    device_only_audio: true,
    no_cloud_audio: true,
    therapist_export_opt_in: false,
    acknowledged_at: null,
  },
};

const MODE_PRIVACY = {
  off: { mic: false, server_text: false, local_audio: false, label: 'Everything off' },
  wake_word: { mic: true, server_text: false, local_audio: false, label: 'Wake word only — say Lumin to activate' },
  scheduled: { mic: true, server_text: false, local_audio: false, label: 'Scheduled window — mic active in your chosen hours' },
  conflict_only: { mic: true, server_text: false, local_audio: true, label: 'Conflict-only — local mic; clips on device if enabled' },
  ambient_full: { mic: true, server_text: true, local_audio: false, label: 'Full ambient — text may go to LifeOS server; no raw audio' },
};

export const LISTENING_ONBOARDING_PROMPT = `You are Lumin — Adam's LifeOS front door (user may say Lumen; treat as the same).

This is a **Listening & Privacy onboarding** conversation. Your job:
1. Welcome warmly. Nothing turns on until the user explicitly chooses.
2. Walk topics one at a time: listening modes, physical controls, what is stored where, family/partner consent, win moments vs conflict clips, therapist export.
3. For each topic: explain **benefits**, **precautions**, and **honest limits** (browser vs native app; iOS background mic needs the LifeOS phone app).
4. Never claim "nothing ever touches our servers" globally — be mode-specific:
   - off / wake_word / conflict_only with clips: audio stays on device unless they opt in
   - ambient_full: **text transcripts** may go to LifeOS to log commitments — **not raw audio**
5. Never claim immunity from government/compelled access — say: we don't build surveillance in, don't sell data, user can delete, minimal retention by design.
6. Partner/household features require **separate opt-in** from each person.
7. When the user confirms choices, output a fenced block they can apply:

\`\`\`listening_profile
{ "mode": "conflict_only", "master_enabled": true, "capture": { "conflict_clips": true }, ... }
\`\`\`

Only include keys the user agreed to. Ask before enabling anything sensitive.
Keep responses conversational — 2–4 short paragraphs max unless they ask for depth.
System commands and builds belong in the main Lumin drawer — this page is prefs only.`;

export async function buildListeningOnboardingContext(pool, userRef, { handle = 'adam' } = {}) {
  if (!pool) return null;
  let userId = userRef;
  if (!userId || !/^\d+$/.test(String(userId))) {
    const { makeLifeOSUserResolver } = await import('./lifeos-user-resolver.js');
    const resolveUserId = makeLifeOSUserResolver(pool);
    userId = await resolveUserId(handle);
  }
  if (!userId) return null;
  const listening = createLifeOSListeningProfile({ pool });
  const current = await listening.getProfile(userId);
  return {
    listening_profile: current.profile,
    privacy_matrix: MODE_PRIVACY,
    onboarding_done: current.onboarding_done,
    onboarding_instructions: LISTENING_ONBOARDING_PROMPT,
  };
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = { ...base };
  for (const key of Object.keys(patch)) {
    const val = patch[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof base[key] === 'object' && base[key]) {
      out[key] = deepMerge(base[key], val);
    } else if (val !== undefined) {
      out[key] = val;
    }
  }
  return out;
}

function normalizeProfile(raw = {}) {
  const merged = deepMerge(DEFAULT_LISTENING_PROFILE, raw);
  const allowedModes = ['off', 'wake_word', 'scheduled', 'conflict_only', 'ambient_full'];
  if (!allowedModes.includes(merged.mode)) merged.mode = 'off';
  merged.wake_word = String(merged.wake_word || 'lumen').toLowerCase();
  return merged;
}

export function createLifeOSListeningProfile({ pool, callAI, logger }) {
  const log = logger || console;

  async function getProfile(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM lifeos_listening_profiles WHERE user_id = $1`,
      [userId],
    );
    if (!rows[0]) {
      return {
        user_id: userId,
        master_enabled: false,
        onboarding_done: false,
        onboarding_step: null,
        profile: { ...DEFAULT_LISTENING_PROFILE },
      };
    }
    const row = rows[0];
    return {
      user_id: userId,
      master_enabled: row.master_enabled,
      onboarding_done: row.onboarding_done,
      onboarding_step: row.onboarding_step,
      last_applied_at: row.last_applied_at,
      profile: normalizeProfile(row.profile_json || {}),
    };
  }

  async function saveProfile(userId, { profile, master_enabled, onboarding_done, onboarding_step } = {}) {
    const current = await getProfile(userId);
    const nextProfile = normalizeProfile(profile ? deepMerge(current.profile, profile) : current.profile);
    if (onboarding_done) nextProfile.onboarding_completed = true;
    const master = master_enabled !== undefined ? Boolean(master_enabled) : current.master_enabled;
    const onboarded = onboarding_done !== undefined ? Boolean(onboarding_done) : current.onboarding_done;
    const step = onboarding_step !== undefined ? onboarding_step : current.onboarding_step;

    const { rows: [row] } = await pool.query(
      `INSERT INTO lifeos_listening_profiles
         (user_id, master_enabled, onboarding_done, profile_json, onboarding_step, last_applied_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         master_enabled = EXCLUDED.master_enabled,
         onboarding_done = EXCLUDED.onboarding_done,
         profile_json = EXCLUDED.profile_json,
         onboarding_step = EXCLUDED.onboarding_step,
         last_applied_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [userId, master, onboarded, JSON.stringify(nextProfile), step],
    );
    return {
      user_id: userId,
      master_enabled: row.master_enabled,
      onboarding_done: row.onboarding_done,
      onboarding_step: row.onboarding_step,
      last_applied_at: row.last_applied_at,
      profile: normalizeProfile(row.profile_json),
      privacy_by_mode: MODE_PRIVACY[nextProfile.mode] || MODE_PRIVACY.off,
    };
  }

  function getPrivacyMatrix() {
    return MODE_PRIVACY;
  }

  function extractProfilePatchFromText(text) {
    const body = String(text || '');
    const fence = body.match(/```listening_profile\s*([\s\S]*?)```/i);
    if (!fence) return null;
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      return null;
    }
  }

  const LUMEN_ONBOARDING_SYSTEM = LISTENING_ONBOARDING_PROMPT;

  async function onboardingChat(userId, userMessage, { threadId, luminChat } = {}) {
    if (!luminChat) throw new Error('luminChat required');
    const current = await getProfile(userId);
    const context = {
      listening_profile: current.profile,
      privacy_matrix: MODE_PRIVACY,
      onboarding_done: current.onboarding_done,
    };

    let thread = threadId
      ? await luminChat.getThread(threadId, userId)
      : null;
    if (!thread) {
      thread = await luminChat.createThread(userId, {
        mode: 'listening_onboarding',
        title: 'Listening setup with Lumen',
      });
    }

    const result = await luminChat.chatWithSystemOverride(thread.id, userId, userMessage, {
      systemPrompt: LUMEN_ONBOARDING_SYSTEM,
      contextData: context,
    });

    const patch = extractProfilePatchFromText(result.reply?.content || result.content || '');
    return {
      thread_id: thread.id,
      reply: result.reply || result,
      suggested_patch: patch,
    };
  }

  return {
    getProfile,
    saveProfile,
    getPrivacyMatrix,
    extractProfilePatchFromText,
    onboardingChat,
    DEFAULT_LISTENING_PROFILE,
    MODE_PRIVACY,
  };
}
