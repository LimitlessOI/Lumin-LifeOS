/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-interaction-service.js
 * Lawful interaction capture, transcript analysis, commitment extraction, client-memory suggestions,
 * and coaching review for TC workflows. Recording fails closed when disclosure/consent requirements
 * are not satisfied for the interaction type.
 */

import { createCommitmentDetector } from './commitment-detector.js';
import { createTranscriber } from './word-keeper-transcriber.js';

function extractResponseText(response) {
  if (typeof response === 'string') return response;
  if (response?.content) return response.content;
  if (response?.text) return response.text;
  if (response?.message?.content) return response.message.content;
  return '';
}

function parseJsonResponse(text, fallback) {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return fallback;
  try {
    return JSON.parse(match[0]);
  } catch {
    return fallback;
  }
}

function createCouncilAdapter(callCouncilMember) {
  if (!callCouncilMember) return null;
  return {
    async ask(prompt, options = {}) {
      const preferred = String(options.model || '').toLowerCase();
      const member = preferred.includes('claude') || preferred.includes('anthropic') ? 'anthropic' : 'groq';
      const response = await callCouncilMember(member, prompt, {
        taskType: options.taskType || 'json',
        maxTokens: options.maxTokens || 500,
        temperature: options.temperature ?? 0.1,
        systemPrompt: options.systemPrompt,
      });
      return { content: extractResponseText(response) };
    },
  };
}

function uniqueArray(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeProfileUpdates(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      key: item.key || item.field || null,
      label: item.label || item.key || item.field || null,
      value: item.value ?? null,
      confidence: Number(item.confidence) || null,
      reason: item.reason || null,
      sensitive: !!item.sensitive,
    }))
    .filter((item) => item.key && item.value != null)
    .slice(0, 10);
}

function fallbackProfileUpdates(transcript = '') {
  const text = String(transcript || '');
  const suggestions = [];
  const budget = text.match(/\$\s?([0-9]{2,3}(?:,[0-9]{3})+|[0-9]{3,7})/);
  if (budget) {
    suggestions.push({
      key: 'budget_hint',
      label: 'Budget signal',
      value: budget[0].replace(/\s+/g, ''),
      confidence: 0.55,
      reason: 'Dollar amount mentioned during interaction.',
      sensitive: false,
    });
  }
  if (/\bcash\b/i.test(text)) {
    suggestions.push({ key: 'financing_type', label: 'Financing type', value: 'cash', confidence: 0.8, reason: 'Client said cash.', sensitive: false });
  } else if (/\bFHA\b/i.test(text)) {
    suggestions.push({ key: 'financing_type', label: 'Financing type', value: 'FHA', confidence: 0.8, reason: 'Client mentioned FHA.', sensitive: false });
  } else if (/\bVA\b/i.test(text)) {
    suggestions.push({ key: 'financing_type', label: 'Financing type', value: 'VA', confidence: 0.8, reason: 'Client mentioned VA.', sensitive: false });
  } else if (/\bconventional\b/i.test(text)) {
    suggestions.push({ key: 'financing_type', label: 'Financing type', value: 'conventional', confidence: 0.8, reason: 'Client mentioned conventional financing.', sensitive: false });
  }
  if (/\bsell (?:our|my|their) (?:home|house) first\b|\bcontingen(?:cy|t)\b/i.test(text)) {
    suggestions.push({ key: 'sale_contingency_required', label: 'Sale contingency', value: true, confidence: 0.72, reason: 'Conversation mentioned selling current home first or contingency.', sensitive: false });
  }
  if (/\btext me\b|\bvia text\b|\bsms\b/i.test(text)) {
    suggestions.push({ key: 'preferred_contact_channel', label: 'Preferred contact', value: 'sms', confidence: 0.7, reason: 'Client asked for text communication.', sensitive: false });
  } else if (/\bemail me\b|\bvia email\b/i.test(text)) {
    suggestions.push({ key: 'preferred_contact_channel', label: 'Preferred contact', value: 'email', confidence: 0.7, reason: 'Client asked for email communication.', sensitive: false });
  }
  return suggestions;
}

function fallbackCoachingReview({ transcript = '', commitments = [], profileUpdates = [] } = {}) {
  const snippet = String(transcript || '').replace(/\s+/g, ' ').trim();
  return {
    summary: snippet ? snippet.slice(0, 320) : 'No transcript available to analyze.',
    result_assessment: commitments.length ? 'Commitments or next-step promises were made.' : 'No clear commitment language was detected.',
    client_reaction: /concern|worried|nervous|hesitant/i.test(snippet) ? 'Client expressed some concern or hesitation.' : 'No strong concern signals were detected heuristically.',
    missed_signals: /price|budget|too high/i.test(snippet) ? ['Price sensitivity signal mentioned.'] : [],
    improvements: [
      'Confirm the client\'s exact next step before ending the interaction.',
      profileUpdates.length ? 'Review suggested client-profile updates and approve only high-signal facts.' : 'Capture at least one structured client preference from the interaction.',
    ],
    reflective_questions: [
      'What did the client actually react to most strongly?',
      'What important constraint or hesitation should be confirmed next?',
      'Did the conversation end with a clear, owned next step?',
    ],
    next_actions: commitments.slice(0, 5).map((item) => item.normalizedText || item.rawText),
  };
}

function normalizeCoachingReview(review, fallback) {
  if (!review || typeof review !== 'object') return fallback;
  return {
    summary: review.summary || fallback.summary,
    result_assessment: review.result_assessment || review.results || fallback.result_assessment,
    client_reaction: review.client_reaction || fallback.client_reaction,
    missed_signals: uniqueArray(Array.isArray(review.missed_signals) ? review.missed_signals : fallback.missed_signals),
    improvements: uniqueArray(Array.isArray(review.improvements) ? review.improvements : fallback.improvements),
    reflective_questions: uniqueArray(Array.isArray(review.reflective_questions) ? review.reflective_questions : fallback.reflective_questions),
    next_actions: uniqueArray(Array.isArray(review.next_actions) ? review.next_actions : fallback.next_actions),
  };
}

function resolveRecordingPolicy(payload = {}) {
  const interactionType = String(payload.interaction_type || 'in_person').toLowerCase();
  const jurisdiction = String(payload.jurisdiction || 'NV').toUpperCase();
  const recordingRequested = payload.recording_requested !== false;
  const disclosedRecording = !!(payload.disclosed_recording || payload.disclosure_given || payload.consent_confirmed);
  const visibleRecordingState = !!(payload.visible_recording_state || payload.disclosed_recording);

  if (!recordingRequested) {
    return {
      interaction_type: interactionType,
      jurisdiction,
      recording_mode: 'notes_only',
      recording_allowed: false,
      policy_reason: 'Recording not requested.',
      policy_status: 'notes_only',
    };
  }

  const requiresDisclosure = interactionType === 'phone_call' || interactionType === 'video_call';
  if (requiresDisclosure && !disclosedRecording) {
    return {
      interaction_type: interactionType,
      jurisdiction,
      recording_mode: 'notes_only',
      recording_allowed: false,
      policy_reason: 'Phone/video interactions require disclosed recording; disclosure path was not confirmed.',
      policy_status: 'blocked_recording',
    };
  }

  if (!requiresDisclosure && !visibleRecordingState) {
    return {
      interaction_type: interactionType,
      jurisdiction,
      recording_mode: 'notes_only',
      recording_allowed: false,
      policy_reason: 'Visible recording state not confirmed for local interaction.',
      policy_status: 'notes_only',
    };
  }

  if (jurisdiction !== 'NV' && jurisdiction !== 'NEVADA') {
    return {
      interaction_type: interactionType,
      jurisdiction,
      recording_mode: 'notes_only',
      recording_allowed: false,
      policy_reason: 'Jurisdiction-specific recording policy is not configured; fail closed to notes-only mode.',
      policy_status: 'blocked_recording',
    };
  }

  return {
    interaction_type: interactionType,
    jurisdiction,
    recording_mode: requiresDisclosure ? 'disclosed_recording' : 'local_recording',
    recording_allowed: true,
    policy_reason: requiresDisclosure ? 'Disclosed recording confirmed for call/video interaction.' : 'Visible local recording state confirmed.',
    policy_status: 'recording_allowed',
  };
}

export function createTCInteractionService({ pool, coordinator, callCouncilMember = null, logger = console }) {
  const councilService = createCouncilAdapter(callCouncilMember);
  const detector = createCommitmentDetector(councilService || { ask: async () => ({ content: '' }) });
  const transcriber = createTranscriber();

  async function listInteractions(transactionId, { limit = 50 } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_interactions WHERE transaction_id=$1 ORDER BY COALESCE(ended_at, started_at) DESC LIMIT $2`,
      [transactionId, Math.min(Number(limit) || 50, 200)]
    );
    return rows;
  }

  async function getInteraction(interactionId) {
    const { rows } = await pool.query(`SELECT * FROM tc_interactions WHERE id=$1`, [interactionId]);
    return rows[0] || null;
  }

  async function createInteraction(transactionId, payload = {}) {
    const policy = resolveRecordingPolicy(payload);
    const {
      interaction_type = policy.interaction_type,
      contact_name = null,
      contact_role = 'client',
      channel = null,
      started_at = new Date().toISOString(),
      notes = null,
      summary = null,
      metadata = {},
    } = payload;

    const mergedMetadata = {
      ...(metadata || {}),
      policy_reason: policy.policy_reason,
      policy_status: policy.policy_status,
      visible_recording_state: !!payload.visible_recording_state,
      disclosed_recording: !!payload.disclosed_recording,
      consent_confirmed: !!payload.consent_confirmed,
    };

    const { rows } = await pool.query(
      `INSERT INTO tc_interactions (
         transaction_id, interaction_type, contact_name, contact_role, channel,
         recording_mode, recording_allowed, disclosure_status, consent_basis,
         status, started_at, notes, summary, commitments, profile_updates, coaching_review, next_actions, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'[]'::jsonb,'[]'::jsonb,'{}'::jsonb,'[]'::jsonb,$14)
       RETURNING *`,
      [
        transactionId,
        interaction_type,
        contact_name,
        contact_role,
        channel,
        policy.recording_mode,
        policy.recording_allowed,
        policy.recording_allowed ? 'disclosed' : 'notes_only',
        policy.policy_status,
        'open',
        started_at,
        notes,
        summary,
        JSON.stringify(mergedMetadata),
      ]
    );
    const row = rows[0];
    await coordinator.logEvent(transactionId, 'interaction_created', {
      interaction_id: row.id,
      interaction_type: row.interaction_type,
      recording_mode: row.recording_mode,
      recording_allowed: row.recording_allowed,
      contact_role: row.contact_role,
    });
    return row;
  }

  async function updateInteraction(interactionId, patch = {}) {
    const current = await getInteraction(interactionId);
    if (!current) return null;
    const fields = [];
    const values = [];
    const allowed = [
      'interaction_type', 'contact_name', 'contact_role', 'channel', 'recording_mode', 'recording_allowed',
      'disclosure_status', 'consent_basis', 'status', 'started_at', 'ended_at', 'duration_seconds',
      'transcript_text', 'notes', 'summary', 'commitments', 'profile_updates', 'coaching_review', 'next_actions', 'metadata',
    ];
    for (const key of allowed) {
      if (key in patch) {
        const isJson = ['commitments', 'profile_updates', 'coaching_review', 'next_actions', 'metadata'].includes(key);
        values.push(isJson ? JSON.stringify(patch[key] || (key === 'coaching_review' ? {} : [])) : patch[key]);
        fields.push(`${key}=$${values.length}`);
      }
    }
    if (!fields.length) return current;
    values.push(interactionId);
    const { rows } = await pool.query(
      `UPDATE tc_interactions SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async function extractProfileUpdates(interaction, transcript) {
    const fallback = fallbackProfileUpdates(transcript);
    if (!councilService || !transcript || transcript.length < 40) return fallback;

    const tx = await coordinator.getTransaction(interaction.transaction_id);
    const existingFacts = tx?.parties || {};
    const prompt = `Analyze this real-estate client interaction transcript and return ONLY valid JSON with an array field named updates.

Transcript:
${transcript}

Existing transaction party data:
${JSON.stringify(existingFacts)}

Return JSON:
{
  "updates": [
    {
      "key": "sale_contingency_required|preferred_contact_channel|financing_type|budget_hint|timeline_hint|must_have|deal_breaker|urgency_level|risk_tolerance|family_context|other",
      "label": "short human label",
      "value": "string|boolean|number",
      "confidence": 0.0,
      "reason": "why this is worth storing",
      "sensitive": false
    }
  ]
}

Rules:
- Only include useful, reviewable, high-signal facts.
- Do not dump transcript fragments.
- If nothing clear, return {"updates": []}.`;

    try {
      const response = await councilService.ask(prompt, {
        model: 'anthropic',
        taskType: 'json',
        maxTokens: 500,
        temperature: 0.1,
        systemPrompt: 'Return only valid JSON.',
      });
      const parsed = parseJsonResponse(response.content, { updates: [] });
      const normalized = normalizeProfileUpdates(parsed?.updates);
      return normalized.length ? normalized : fallback;
    } catch (error) {
      logger.warn?.({ err: error.message }, '[TC-INTERACTION] profile update extraction failed');
      return fallback;
    }
  }

  async function extractCoachingReview(interaction, transcript, commitments, profileUpdates) {
    const fallback = fallbackCoachingReview({ transcript, commitments, profileUpdates });
    if (!councilService || !transcript || transcript.length < 60) return fallback;

    const prompt = `You are reviewing a real-estate client interaction for service quality and improvement.
Return ONLY valid JSON.

Interaction type: ${interaction.interaction_type}
Contact role: ${interaction.contact_role}
Transcript:
${transcript}

Detected commitments:
${JSON.stringify(commitments)}

Suggested profile updates:
${JSON.stringify(profileUpdates)}

Return JSON with keys:
summary, result_assessment, client_reaction, missed_signals, improvements, reflective_questions, next_actions

Rules:
- Be concrete and non-judgmental.
- Missed signals should be short bullet strings.
- Improvements should be actionable.
- Reflective questions should help the agent improve next time.
- next_actions should be terse action items.
- No filler.`;

    try {
      const response = await councilService.ask(prompt, {
        model: 'anthropic',
        taskType: 'json',
        maxTokens: 650,
        temperature: 0.2,
        systemPrompt: 'Return only valid JSON.',
      });
      const parsed = parseJsonResponse(response.content, null);
      return normalizeCoachingReview(parsed, fallback);
    } catch (error) {
      logger.warn?.({ err: error.message }, '[TC-INTERACTION] coaching review failed');
      return fallback;
    }
  }

  async function persistCommitments(interaction, commitments, context) {
    if (!commitments.length) return [];
    const stored = [];
    for (const item of commitments) {
      const { rows } = await pool.query(
        `INSERT INTO commitments (
           user_id, to_person, relationship, raw_text, normalized_text, category, deadline, deadline_raw,
           detected_from, transcript_context, confidence, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
         RETURNING id, deadline, normalized_text, raw_text, status`,
        [
          interaction.metadata?.agent_id || 'adam',
          item.toWhom || interaction.contact_name || null,
          item.relationship || interaction.contact_role || 'client',
          item.rawText,
          item.normalizedText || item.normalized || item.rawText,
          item.category || 'work',
          item.deadline || item.byWhen || null,
          item.deadlineRaw || item.byWhenRaw || null,
          'tc_interaction',
          context || null,
          item.confidence || null,
        ]
      );
      stored.push({ ...rows[0], confidence: item.confidence || null });
    }
    return stored;
  }

  async function analyzeInteraction(interactionId, payload = {}) {
    const interaction = await getInteraction(interactionId);
    if (!interaction) return { ok: false, error: 'Interaction not found' };

    let transcriptText = String(payload.transcript_text || payload.transcriptText || interaction.transcript_text || '').trim();
    if (!transcriptText && payload.audioFile?.buffer && interaction.recording_allowed) {
      transcriptText = await transcriber.transcribeFormData(payload.audioFile);
    }
    const context = String(payload.context || payload.transcript_context || interaction.notes || '').trim();

    if (!transcriptText) {
      return { ok: false, error: interaction.recording_allowed ? 'Transcript text or audio is required' : 'Interaction is notes-only and no transcript was provided' };
    }

    const commitments = await detector.scan(transcriptText, context);
    const storedCommitments = payload.persist_commitments === false
      ? []
      : await persistCommitments(interaction, commitments, context || transcriptText.slice(0, 500));
    const profileUpdates = await extractProfileUpdates(interaction, transcriptText);
    const coachingReview = await extractCoachingReview(interaction, transcriptText, commitments, profileUpdates);
    const nextActions = uniqueArray([
      ...(Array.isArray(coachingReview.next_actions) ? coachingReview.next_actions : []),
      ...storedCommitments.map((item) => item.normalized_text || item.raw_text),
      ...profileUpdates.map((item) => `Review profile update: ${item.label}`),
    ]).slice(0, 10);

    const updated = await updateInteraction(interactionId, {
      transcript_text: transcriptText,
      status: 'analyzed',
      ended_at: payload.ended_at || interaction.ended_at || new Date().toISOString(),
      duration_seconds: payload.duration_seconds || payload.durationSeconds || interaction.duration_seconds || null,
      summary: coachingReview.summary,
      commitments: commitments.map((item, index) => ({ ...item, stored_commitment_id: storedCommitments[index]?.id || null })),
      profile_updates: profileUpdates,
      coaching_review: coachingReview,
      next_actions: nextActions,
      metadata: {
        ...(interaction.metadata || {}),
        analyzed_at: new Date().toISOString(),
        transcript_length: transcriptText.length,
        commitment_count: commitments.length,
        profile_update_count: profileUpdates.length,
      },
    });

    await coordinator.logEvent(interaction.transaction_id, 'interaction_analyzed', {
      interaction_id: interactionId,
      commitments_detected: commitments.length,
      profile_updates_detected: profileUpdates.length,
      recording_mode: interaction.recording_mode,
    });

    return {
      ok: true,
      interaction: updated,
      commitments,
      stored_commitments: storedCommitments,
      profile_updates: profileUpdates,
      coaching_review: coachingReview,
      next_actions: nextActions,
    };
  }

  return {
    resolveRecordingPolicy,
    listInteractions,
    getInteraction,
    createInteraction,
    updateInteraction,
    analyzeInteraction,
  };
}

export default createTCInteractionService;
