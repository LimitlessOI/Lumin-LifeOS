// SYNOPSIS: Express route module for MarketingOS session API.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { Router } from 'express';
import { createHash } from 'crypto';
import { getDesignSystemForBrand, buildDesignSystemPrompt } from '../config/design-studio.js';

const router = Router();

function toOwnerUuid(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
        return s.toLowerCase();
    }
    const hex = createHash('sha256').update(`marketing-owner:${s}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Prefer JWT handle for clients. Command-key (no JWT) may pass owner_id (founder desk).
const getOwnerId = (req) => {
    const handle = req.lifeosUser?.handle || req.user?.handle || req.user?.username || null;
    const sub = req.lifeosUser?.sub || req.user?.id || req.user?.sub || null;
    const jwtPresent = Boolean(handle || sub);
    if (jwtPresent) {
      const raw = handle || (sub && !/^\d+$/.test(String(sub)) ? String(sub) : null) || sub;
      return toOwnerUuid(raw);
    }
    const bodyOwner = req.body?.owner_id || req.query?.owner_id || null;
    return toOwnerUuid(bodyOwner || 'adam');
};

function isFounderBypass(req) {
    const role = String(req.lifeosUser?.role || req.user?.role || '').toLowerCase();
    const handle = String(req.lifeosUser?.handle || req.user?.handle || '').toLowerCase();
    if (role === 'admin' || role === 'founder' || handle === 'adam') return true;
    // Command-key path (no JWT): founder operating the desk
    if (!req.lifeosUser && !req.user && (req.headers['x-command-key'] || req.headers['x-api-key'])) {
      return true;
    }
    return false;
}

async function sessionIsPaid(pool, sessionId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM marketing_pack_checkouts
        WHERE session_id = $1 AND status = 'paid'
        LIMIT 1`,
      [sessionId]
    );
    return rows.length > 0;
}

function councilText(aiResponse) {
    if (aiResponse == null) return '';
    if (typeof aiResponse === 'string') return aiResponse;
    if (typeof aiResponse === 'object') {
        return String(
            aiResponse.text
            || aiResponse.content
            || aiResponse.message
            || aiResponse.output
            || (Array.isArray(aiResponse.choices) ? aiResponse.choices[0]?.message?.content : '')
            || ''
        );
    }
    return String(aiResponse);
}

const parseCouncilResponse = (text) => {
    try {
        const raw = councilText(text).trim();
        if (!raw) return null;
        const mdMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (mdMatch && mdMatch[1]) {
            return JSON.parse(mdMatch[1].trim());
        }
        if (raw.startsWith('[') || raw.startsWith('{')) {
            return JSON.parse(raw);
        }
        const jsonMatch = raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
        if (jsonMatch && jsonMatch[1]) {
            return JSON.parse(jsonMatch[1]);
        }
    } catch (e) {
        return null;
    }
    return null;
};

function heuristicExtractionsFromTranscript(transcriptText) {
    const lines = String(transcriptText || '')
        .split(/\n+/)
        .map((l) => l.replace(/^(user|assistant|coach|you):\s*/i, '').trim())
        .filter((l) => l.length >= 24);
    const out = [];
    const push = (extraction_type, raw_text, confidence_score) => {
        if (!raw_text) return;
        out.push({
            extraction_type,
            raw_text: String(raw_text).slice(0, 1200),
            confidence_score,
            source_quote: String(raw_text).slice(0, 400),
        });
    };
    if (lines[0]) push('hook', lines[0], 0.55);
    const story = lines.find((l) => /\b(I|we|my|client|family|when|after)\b/i.test(l) && l.length > 40);
    if (story) push('story', story, 0.5);
    const teach = lines.find((l) => /\b(because|so|means|check|avoid|don't|do not)\b/i.test(l));
    if (teach) push('teaching', teach, 0.48);
    const cta = lines.find((l) => /\b(reach out|message|call|book|dm|comment|talk)\b/i.test(l));
    if (cta) push('cta', cta, 0.5);
    const offer = lines.find((l) => /\b(help|consult|walkthrough|I help)\b/i.test(l));
    if (offer) push('offer', offer, 0.45);
    if (!out.length && lines[0]) push('emotional_truth', lines.slice(0, 3).join(' '), 0.4);
    return out.slice(0, 6);
}

export async function registerMarketingSessionRoutes(app, deps) {
    const { pool, requireKey, callCouncilMember, logger, baseUrl } = deps;

    // Middleware to attach deps to req for easier access in handlers
    router.use((req, res, next) => {
        req.deps = deps;
        next();
    });

    // POST /api/v1/marketing/consent
    router.post('/consent', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { consent_type } = req.body;
            const consent_text = String(req.body?.consent_text || req.body?.consentText || '').trim()
              || (
                consent_type === 'session_recording'
                  ? 'I agree to allow SocialMediaOS to process my session input (including camera/mic takes when I record) and generate marketing content. I am responsible for reviewing and approving all generated content before publication.'
                  : consent_type
                    ? `I consent to ${consent_type} for SocialMediaOS marketing workflows.`
                    : ''
              );

            const validConsentTypes = ["session_recording","voice_reuse","likeness_reuse","data_sharing"];
            if (!validConsentTypes.includes(consent_type)) {
                return res.status(400).json({ ok: false, error: 'Invalid consent_type.' });
            }
            if (!consent_text) {
                return res.status(400).json({ ok: false, error: 'consent_text is required.' });
            }

            const result = await pool.query(
                `INSERT INTO marketing_consent_records (owner_id, consent_type, consent_text) VALUES ($1, $2, $3) RETURNING id`,
                [owner_id, consent_type, consent_text]
            );
            res.status(201).json({ ok: true, id: result.rows[0].id });
        } catch (error) {
            logger.error('Error in POST /api/v1/marketing/consent:', error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // POST /api/v1/marketing/sessions
    router.post('/sessions', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { consent_record_id } = req.body;
            if (!consent_record_id) {
                return res.status(400).json({ ok: false, error: 'consent_record_id is required.' });
            }

            // Validate consent_record_id
            const consentCheck = await pool.query(
                `SELECT id FROM marketing_consent_records WHERE id = $1 AND owner_id = $2`,
                [consent_record_id, owner_id]
            );
            if (consentCheck.rows.length === 0) {
                return res.status(400).json({ ok: false, error: 'Invalid or unknown consent_record_id.' });
            }

            const result = await pool.query(
                `INSERT INTO marketing_sessions (owner_id, consent_record_id, input_mode, session_type, status, coach_messages_json) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [owner_id, consent_record_id, 'text', 'coaching', 'active', JSON.stringify([])]
            );
            res.status(201).json({ ok: true, ...result.rows[0] });
        } catch (error) {
            logger.error('Error in POST /api/v1/marketing/sessions:', error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // POST /api/v1/marketing/sessions/:id/coach
    router.post('/sessions/:id/coach', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { id } = req.params;
            const {
                message,
                talk_pack: talkPackBody,
                seed_pack: seedPackBody,
                bullet_index: bulletIndexBody,
                line_index: lineIndexBody,
                mode: coachModeBody,
            } = req.body;
            if (!message) {
                return res.status(400).json({ ok: false, error: 'Message is required.' });
            }

            let talkPack = talkPackBody && typeof talkPackBody === 'object' ? talkPackBody : null;
            if (!talkPack && typeof seedPackBody === 'string' && seedPackBody.trim()) {
                try {
                    talkPack = JSON.parse(Buffer.from(seedPackBody, 'base64url').toString('utf8'));
                } catch {
                    try {
                        talkPack = JSON.parse(decodeURIComponent(seedPackBody));
                    } catch {
                        talkPack = null;
                    }
                }
            }

            const sessionResult = await pool.query(
                `SELECT coach_messages_json FROM marketing_sessions WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );
            if (sessionResult.rows.length === 0) {
                return res.status(404).json({ ok: false, error: 'Session not found.' });
            }

            const coachMessages = sessionResult.rows[0].coach_messages_json || [];
            coachMessages.push({ role: 'user', content: message });

            const bulletIndex = Number.isFinite(Number(bulletIndexBody)) ? Number(bulletIndexBody) : 0;
            const lineIndex = Number.isFinite(Number(lineIndexBody)) ? Number(lineIndexBody) : 0;
            const coachMode = String(coachModeBody || 'live').trim() || 'live';
            const scriptLines = Array.isArray(talkPack?.sample_script) ? talkPack.sample_script : [];
            const currentLine = scriptLines[lineIndex] || '';
            const packJson = talkPack ? JSON.stringify(talkPack) : 'null';
            const systemPrompt = talkPack
                ? `You are a talk-card PRODUCER + teleprompter coach for a founder filming on camera.
He has a full sample script he can READ like a teleprompter. Do NOT ask vague "what should I say?" and do NOT rewrite him into AI-sounding copy.

Talk card (JSON): ${packJson}
Current teleprompter line index (0-based): ${lineIndex}
Current line text: ${JSON.stringify(currentLine)}
Current bullet index: ${bulletIndex}
Mode: ${coachMode} (live = while reading/practicing; after_read = full take review; freestyle = off-script practice)

Your job:
1. Track where he is on the script. If he goes off topic, leave the highlight at the last good line and say "pick up here: …"
2. Quote language that landed — "I liked when you said…"
3. Flag reading-sound ("you sound like you're reading that line — freestyle this beat using the story you told earlier")
4. Push must_say / competitor_gap beats he skipped — "this video has to land: …"
5. After a full read, give redo notes: which lines to remake, which to freestyle, which story to pull from another take
6. Keep replies short (2–4 sentences). Sharp producer, not chatbot.

Respond ONLY with JSON:
{
  "response": "producer reply",
  "hookDetected": true/false,
  "hookText": "phrase or null",
  "currentBullet": 0,
  "lineIndex": 0,
  "quotedMoment": "exact words you liked or null",
  "askMore": true/false,
  "soundsLikeReading": true/false,
  "freestyleCue": "one freestyle instruction or null",
  "missedMustSay": "must-say he skipped or null",
  "redoFromLine": null,
  "pickUpLine": "exact teleprompter line to resume or null"
}`
                : `You are a talk-card producer coach. Help the founder lock a hook, intro, sample script lines, must_say beats, and exit. Prefer lived specificity. Respond with JSON: { "response": "…", "hookDetected": true/false, "hookText": "…", "currentBullet": null, "lineIndex": 0, "quotedMoment": null, "askMore": false, "soundsLikeReading": false, "freestyleCue": null, "missedMustSay": null, "redoFromLine": null, "pickUpLine": null }.`;
            const history = coachMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            const fullPrompt = `${systemPrompt}\n\nConversation history:\n${history}\n\nAI:`;

            const aiResponseText = await callCouncilMember('gemini_flash', fullPrompt);
            const aiResponse = parseCouncilResponse(aiResponseText);

            let responseContent = 'An error occurred while processing the AI response.';
            let hookDetected = false;
            let hookText = null;
            let currentBullet = bulletIndex;
            let nextLineIndex = lineIndex;
            let quotedMoment = null;
            let askMore = false;
            let soundsLikeReading = false;
            let freestyleCue = null;
            let missedMustSay = null;
            let redoFromLine = null;
            let pickUpLine = null;

            if (aiResponse && typeof aiResponse.response === 'string') {
                responseContent = aiResponse.response;
                hookDetected = aiResponse.hookDetected === true;
                hookText = aiResponse.hookText || null;
                if (Number.isFinite(Number(aiResponse.currentBullet))) currentBullet = Number(aiResponse.currentBullet);
                if (Number.isFinite(Number(aiResponse.lineIndex))) nextLineIndex = Number(aiResponse.lineIndex);
                if (Number.isFinite(Number(aiResponse.redoFromLine))) redoFromLine = Number(aiResponse.redoFromLine);
                quotedMoment = aiResponse.quotedMoment || null;
                askMore = aiResponse.askMore === true;
                soundsLikeReading = aiResponse.soundsLikeReading === true;
                freestyleCue = aiResponse.freestyleCue || null;
                missedMustSay = aiResponse.missedMustSay || null;
                pickUpLine = aiResponse.pickUpLine || null;
            } else {
                responseContent = aiResponseText;
                if (/(energy|specific|numbers|details)/i.test(responseContent)) {
                    hookDetected = true;
                    hookText = responseContent.match(/(energy|specific|numbers|details)/i)?.[0] || null;
                }
            }

            coachMessages.push({
                role: 'assistant',
                content: responseContent,
                metadata: {
                    hookDetected,
                    hookText,
                    currentBullet,
                    lineIndex: nextLineIndex,
                    quotedMoment,
                    askMore,
                    soundsLikeReading,
                    freestyleCue,
                    missedMustSay,
                    redoFromLine,
                    pickUpLine,
                },
            });

            await pool.query(
                `UPDATE marketing_sessions SET coach_messages_json = $1 WHERE id = $2 AND owner_id = $3`,
                [JSON.stringify(coachMessages), id, owner_id]
            );

            res.status(200).json({
                ok: true,
                response: responseContent,
                hookDetected,
                hookText,
                currentBullet,
                lineIndex: nextLineIndex,
                quotedMoment,
                askMore,
                soundsLikeReading,
                freestyleCue,
                missedMustSay,
                redoFromLine,
                pickUpLine,
            });
        } catch (error) {
            logger.error(`Error in POST /api/v1/marketing/sessions/${req.params.id}/coach:`, error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // POST /api/v1/marketing/sessions/:id/extract
    router.post('/sessions/:id/extract', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { id } = req.params;
            const sessionResult = await pool.query(
                `SELECT coach_messages_json FROM marketing_sessions WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );
            if (sessionResult.rows.length === 0) {
                return res.status(404).json({ ok: false, error: 'Session not found.' });
            }

            await pool.query(
                `UPDATE marketing_sessions SET status = 'extracting' WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );

            const coachMessages = sessionResult.rows[0].coach_messages_json || [];
            const transcriptText = coachMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n').trim();
            if (!transcriptText || transcriptText.length < 20) {
                return res.status(400).json({
                    ok: false,
                    error: 'No coaching transcript yet. Talk to the coach (or record a take) before extracting.',
                });
            }

            const extractionPrompt = `Given the following marketing coaching session transcript, extract key marketing content items. For each item, identify its type (must be one of: hook, story, teaching, objection, offer, cta, emotional_truth), the raw text from the transcript, and a confidence score (0-1). Return a JSON array of objects: [{ "extraction_type": "...", "raw_text": "...", "confidence_score": 0.X, "source_quote": "..." }].\n\nTranscript:\n${transcriptText}`;

            let aiResponseText = '';
            try {
                aiResponseText = councilText(await callCouncilMember('gemini_flash', extractionPrompt, {
                    maxTokens: 1800,
                    taskType: 'marketing_extract',
                }));
            } catch (err) {
                logger?.warn?.({ err }, 'extract council call failed; using heuristic fallback');
            }
            let extractions = parseCouncilResponse(aiResponseText);
            if (extractions && !Array.isArray(extractions) && Array.isArray(extractions.items)) {
                extractions = extractions.items;
            }
            if (extractions && !Array.isArray(extractions) && Array.isArray(extractions.extractions)) {
                extractions = extractions.extractions;
            }
            let usedFallback = false;
            if (!Array.isArray(extractions) || !extractions.length) {
                extractions = heuristicExtractionsFromTranscript(transcriptText);
                usedFallback = true;
            }
            if (!Array.isArray(extractions) || !extractions.length) {
                return res.status(422).json({
                    ok: false,
                    error: 'Could not extract story items from this transcript. Add more specific coach turns and retry.',
                });
            }

            const validExtractionTypes = ['hook', 'story', 'teaching', 'objection', 'offer', 'cta', 'emotional_truth'];
            const insertedExtractions = [];

            for (const item of extractions) {
                const extractionType = String(item.extraction_type || item.type || '').trim().toLowerCase();
                if (!validExtractionTypes.includes(extractionType)) {
                    logger.warn(`Skipping invalid extraction_type: ${extractionType}`);
                    continue;
                }
                const rawText = String(item.raw_text || item.text || item.content || '').trim();
                if (!rawText) continue;
                const insertResult = await pool.query(
                    `INSERT INTO marketing_content_extractions (session_id, extraction_type, raw_text, confidence_score, source_quote) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                    [id, extractionType, rawText, Number(item.confidence_score ?? item.confidence ?? 0.5) || 0.5, item.source_quote || rawText]
                );
                insertedExtractions.push(insertResult.rows[0]);
            }

            if (!insertedExtractions.length) {
                return res.status(422).json({ ok: false, error: 'Extraction returned no usable items.' });
            }

            await pool.query(
                `UPDATE marketing_sessions SET extraction_run_at = NOW() WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );

            res.status(200).json({
                ok: true,
                extractions: insertedExtractions,
                fallback: usedFallback || undefined,
            });
        } catch (error) {
            logger.error(`Error in POST /api/v1/marketing/sessions/${req.params.id}/extract:`, error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // POST /api/v1/marketing/sessions/:id/generate
    router.post('/sessions/:id/generate', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { id } = req.params;
            const sessionResult = await pool.query(
                `SELECT id FROM marketing_sessions WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );
            if (sessionResult.rows.length === 0) {
                return res.status(404).json({ ok: false, error: 'Session not found.' });
            }

            await pool.query(
                `UPDATE marketing_sessions SET status = 'generating' WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );

            const channelProfileResult = await pool.query(
                `SELECT brand_voice_json FROM marketing_channel_profiles WHERE owner_id = $1`,
                [owner_id]
            );
            const brandVoice = channelProfileResult.rows[0]?.brand_voice_json || { tone: 'professional', style: 'direct' };
            const designSystem = getDesignSystemForBrand({ tone: brandVoice.tone, industry: brandVoice.industry || 'general' });
            const designSystemPrompt = buildDesignSystemPrompt(designSystem, {
              brandPrimary: brandVoice.primaryColor,
              brandAccent: brandVoice.accentColor,
              businessName: brandVoice.businessName,
              industry: brandVoice.industry,
            });

            const extractionsResult = await pool.query(
                `SELECT * FROM marketing_content_extractions WHERE session_id = $1 ORDER BY id ASC`,
                [id]
            );
            const extractions = extractionsResult.rows;
            if (!extractions.length) {
                return res.status(400).json({
                    ok: false,
                    error: 'No extractions yet. Run Extract Stories first.',
                });
            }

            const generatedPieces = [];
            const validPlatforms = ['instagram', 'linkedin', 'x', 'facebook', 'email', 'general'];
            const validFormats = ['post', 'caption', 'hook', 'subject_line', 'thread', 'short_script'];

            // Fetch transcript for context and ensure we don't duplicate language across pieces.
            const sessionTranscriptResult = await pool.query(
                `SELECT coach_messages_json FROM marketing_sessions WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );
            const coachMessages = sessionTranscriptResult.rows[0]?.coach_messages_json || [];
            const transcriptText = coachMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

            for (const extraction of extractions) {
                const generationPrompt = `You are the MarketingOS content generator.

BRAND VOICE:
${JSON.stringify(brandVoice)}

SHARED DESIGN STUDIO (use this for color, typography, tone, and visual motifs so MarketingOS output is on-brand with the Site Builder studio):
${designSystemPrompt}

Source extraction type: ${extraction.extraction_type}
Source raw text: """${extraction.raw_text}"""
Full session transcript for context:
"""${transcriptText}"""

Generate a DISTINCT content pack of 2-3 pieces from this extraction. Each piece must be different in platform, format, and angle. Do NOT repeat the same wording across pieces. Use the source raw text as the kernel, but adapt the copy for each platform and format.

Valid platforms: ${validPlatforms.join(', ')}.
Valid formats: ${validFormats.join(', ')}.

Return a JSON array of objects with this exact shape:
[
  { "title": "Short title", "platform": "instagram", "format": "post", "content_text": "The rendered piece" }
]

Rules:
- Instagram posts should be concise and visual.
- LinkedIn posts should be professional and story-led.
- X posts should be punchy and under 280 characters.
- Facebook posts can be warmer and longer.
- Email should be a subject_line + short body.
- Hooks should be one-line attention grabbers.
- Subject lines should be one line.
- Every content_text must be different. Do not copy the same sentence between pieces.
- Include a short title for each piece.
- Return ONLY the JSON array.`;

                let aiResponseText = '';
                let generatedByModel = 'fallback_template';
                const modelCascade = ['gemini_flash', 'gpt_4o_mini', 'claude_sonnet'];
                let lastModelError = null;
                for (const model of modelCascade) {
                    try {
                        aiResponseText = councilText(await callCouncilMember(model, generationPrompt, {
                            maxTokens: 2200,
                            taskType: 'marketing_generate',
                        }));
                        if (aiResponseText && String(aiResponseText).trim()) {
                            generatedByModel = model;
                            break;
                        }
                    } catch (modelErr) {
                        lastModelError = modelErr;
                        logger.warn?.(
                            { err: String(modelErr?.message || modelErr).slice(0, 200), model, extractionId: extraction.id },
                            '[MarketingOS] generate model failed — trying next (SO-003 failover)',
                        );
                    }
                }
                if (!aiResponseText && lastModelError) {
                    logger.warn?.(
                        { err: String(lastModelError?.message || lastModelError).slice(0, 200), extractionId: extraction.id },
                        '[MarketingOS] all generate models failed — using template fallback',
                    );
                }
                const generatedContents = parseCouncilResponse(aiResponseText);

                const pieces = Array.isArray(generatedContents)
                    ? generatedContents
                    : (generatedContents && Array.isArray(generatedContents.pieces) ? generatedContents.pieces : null)
                    || (generatedContents && generatedContents.content_text ? [generatedContents] : []);

                if (!pieces.length) {
                    // Deterministic fallback so generate never returns 0 pieces after a successful extract.
                    const fallbackPieces = [
                        {
                            title: `${extraction.extraction_type} — Instagram`,
                            platform: 'instagram',
                            format: 'post',
                            content_text: `${extraction.raw_text}\n\n— If this landed, message me and tell me where you're stuck.`,
                        },
                        {
                            title: `${extraction.extraction_type} — LinkedIn`,
                            platform: 'linkedin',
                            format: 'post',
                            content_text: `A note from the session:\n\n${extraction.raw_text}\n\nCurious what you'd challenge here — comment or DM.`,
                        },
                    ];
                    for (const piece of fallbackPieces) {
                        const insertResult = await pool.query(
                            `INSERT INTO marketing_content_pieces (session_id, extraction_id, title, platform, format, content_text, status, generated_by_model) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                            [id, extraction.id, piece.title, piece.platform, piece.format, piece.content_text, 'draft', 'fallback_template']
                        );
                        generatedPieces.push(insertResult.rows[0]);
                    }
                    logger.warn(`Failed to generate content for extraction ID ${extraction.id}; used template fallback.`);
                    continue;
                }

                for (const piece of pieces) {
                    if (!piece || typeof piece.content_text !== 'string') {
                        logger.warn(`Skipping malformed generated piece for extraction ${extraction.id}`, { piece });
                        continue;
                    }
                    const platform = validPlatforms.includes(piece.platform) ? piece.platform : 'general';
                    const format = validFormats.includes(piece.format) ? piece.format : 'post';
                    const title = typeof piece.title === 'string' && piece.title.trim() ? piece.title.trim() : `${platform} ${format}`;

                    const insertResult = await pool.query(
                        `INSERT INTO marketing_content_pieces (session_id, extraction_id, title, platform, format, content_text, status, generated_by_model) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                        [id, extraction.id, title, platform, format, piece.content_text, 'draft', generatedByModel]
                    );
                    generatedPieces.push(insertResult.rows[0]);
                }
            }

            await pool.query(
                `UPDATE marketing_sessions SET status = 'completed' WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );

            res.status(200).json({ ok: true, pieces: generatedPieces });
        } catch (error) {
            logger.error(`Error in POST /api/v1/marketing/sessions/${req.params.id}/generate:`, error);
            try {
                const ownerFallback = getOwnerId(req);
                const sessionId = req.params.id;
                const extractionsFallback = await pool.query(
                    `SELECT * FROM marketing_content_extractions WHERE session_id = $1 ORDER BY id ASC`,
                    [sessionId]
                );
                const piecesFallback = [];
                for (const extraction of extractionsFallback.rows || []) {
                    const templates = [
                        {
                            title: `${extraction.extraction_type} — Instagram`,
                            platform: 'instagram',
                            format: 'post',
                            content_text: `${extraction.raw_text}\n\n— If this landed, message me and tell me where you're stuck.`,
                        },
                        {
                            title: `${extraction.extraction_type} — LinkedIn`,
                            platform: 'linkedin',
                            format: 'post',
                            content_text: `A note from the session:\n\n${extraction.raw_text}\n\nCurious what you'd challenge here — comment or DM.`,
                        },
                    ];
                    for (const piece of templates) {
                        const insertResult = await pool.query(
                            `INSERT INTO marketing_content_pieces (session_id, extraction_id, title, platform, format, content_text, status, generated_by_model) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                            [sessionId, extraction.id, piece.title, piece.platform, piece.format, piece.content_text, 'draft', 'fallback_template_after_error']
                        );
                        piecesFallback.push(insertResult.rows[0]);
                    }
                }
                if (piecesFallback.length && ownerFallback) {
                    await pool.query(
                        `UPDATE marketing_sessions SET status = 'completed' WHERE id = $1 AND owner_id = $2`,
                        [sessionId, ownerFallback]
                    );
                    return res.status(200).json({
                        ok: true,
                        pieces: piecesFallback,
                        warning: 'ai_generate_failed_used_template_fallback',
                        error_detail: String(error.message || error).slice(0, 240),
                    });
                }
            } catch (_) { /* fall through */ }
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // GET /api/v1/marketing/sessions — recent packs for this owner (SMOS market desk)
    router.get('/sessions', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }
            const limit = Math.max(1, Math.min(Number(req.query.limit) || 12, 40));
            const { rows } = await pool.query(
                `SELECT s.id, s.status, s.session_type, s.input_mode, s.created_at, s.completed_at,
                        (SELECT COUNT(*)::int FROM marketing_content_pieces p WHERE p.session_id = s.id) AS piece_count,
                        (SELECT COUNT(*)::int FROM marketing_content_pieces p WHERE p.session_id = s.id AND p.status = 'approved') AS approved_count
                 FROM marketing_sessions s
                 WHERE s.owner_id = $1
                 ORDER BY COALESCE(s.completed_at, s.created_at) DESC NULLS LAST
                 LIMIT $2`,
                [owner_id, limit]
            );
            res.status(200).json({ ok: true, sessions: rows });
        } catch (error) {
            logger.error('Error in GET /api/v1/marketing/sessions:', error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // POST /api/v1/marketing/sessions/:id/approve-all — approve every draft piece
    router.post('/sessions/:id/approve-all', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }
            const { id } = req.params;
            const owned = await pool.query(
                `SELECT id FROM marketing_sessions WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );
            if (!owned.rows.length) {
                return res.status(404).json({ ok: false, error: 'Session not found.' });
            }
            const { rows } = await pool.query(
                `UPDATE marketing_content_pieces
                 SET status = 'approved'
                 WHERE session_id = $1 AND status = 'draft'
                 RETURNING id, title, platform, format, status`,
                [id]
            );
            res.status(200).json({ ok: true, approved_count: rows.length, pieces: rows });
        } catch (error) {
            logger.error(`Error in POST /api/v1/marketing/sessions/${req.params.id}/approve-all:`, error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // GET /api/v1/marketing/sessions/:id
    router.get('/sessions/:id', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { id } = req.params;
            const sessionResult = await pool.query(
                `SELECT * FROM marketing_sessions WHERE id = $1 AND owner_id = $2`,
                [id, owner_id]
            );
            if (sessionResult.rows.length === 0) {
                return res.status(404).json({ ok: false, error: 'Session not found.' });
            }
            res.status(200).json({ ok: true, session: sessionResult.rows[0] });
        } catch (error) {
            logger.error(`Error in GET /api/v1/marketing/sessions/${req.params.id}:`, error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // GET /api/v1/marketing/sessions/:id/content
    router.get('/sessions/:id/content', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { id } = req.params;
            const contentResult = await pool.query(
                `SELECT p.* FROM marketing_content_pieces p INNER JOIN marketing_sessions s ON s.id = p.session_id WHERE p.session_id = $1 AND s.owner_id = $2 ORDER BY p.created_at ASC`,
                [id, owner_id]
            );
            res.status(200).json({ ok: true, pieces: contentResult.rows });
        } catch (error) {
            logger.error(`Error in GET /api/v1/marketing/sessions/${req.params.id}/content:`, error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // PATCH /api/v1/marketing/content/:id
    router.patch('/content/:id', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { id } = req.params;
            const { action, hint, status } = req.body;
            const normalizedAction = action
              || (status === 'approved' || status === 'approve' ? 'approve' : null)
              || (status === 'rejected' || status === 'reject' ? 'reject' : null)
              || (req.body?.approved === true ? 'approve' : null);

            const pieceResult = await pool.query(
                `SELECT p.* FROM marketing_content_pieces p INNER JOIN marketing_sessions s ON s.id = p.session_id WHERE p.id = $1 AND s.owner_id = $2`,
                [id, owner_id]
            );
            if (pieceResult.rows.length === 0) {
                return res.status(404).json({ ok: false, error: 'Content piece not found.' });
            }
            const currentPiece = pieceResult.rows[0];

            let updatedPiece;
            const validActions = ['approve', 'reject', 'regenerate'];
            if (!validActions.includes(normalizedAction)) {
                return res.status(400).json({ ok: false, error: 'Invalid action. Use approve, reject, or regenerate.' });
            }

            if (normalizedAction === 'approve') {
                const updateResult = await pool.query(
                    `UPDATE marketing_content_pieces SET status = 'approved' WHERE id = $1 RETURNING *`,
                    [id]
                );
                updatedPiece = updateResult.rows[0];
            } else if (normalizedAction === 'reject') {
                const updateResult = await pool.query(
                    `UPDATE marketing_content_pieces SET status = 'rejected' WHERE id = $1 RETURNING *`,
                    [id]
                );
                updatedPiece = updateResult.rows[0];
            } else if (normalizedAction === 'regenerate') {
                const channelProfileResult = await pool.query(
                    `SELECT brand_voice_json FROM marketing_channel_profiles WHERE owner_id = $1`,
                    [owner_id]
                );
                const brandVoice = channelProfileResult.rows[0]?.brand_voice_json || { tone: 'professional', style: 'direct' };

                const extractionResult = await pool.query(
                    `SELECT raw_text, extraction_type FROM marketing_content_extractions WHERE id = $1`,
                    [currentPiece.extraction_id]
                );
                if (extractionResult.rows.length === 0) {
                    return res.status(400).json({ ok: false, error: 'Source extraction for regeneration not found.' });
                }
                const sourceExtraction = extractionResult.rows[0];

                const regenerationPrompt = `Using the brand voice: ${JSON.stringify(brandVoice)}, regenerate the following marketing content piece. Original extraction type: ${sourceExtraction.extraction_type}, raw text: "${sourceExtraction.raw_text}". Current content: "${currentPiece.content_text}". Hint for regeneration: "${hint || 'Make it more engaging.'}". Return a JSON object: { "content_text": "Newly generated content here" }.`;

                const aiResponseText = councilText(await callCouncilMember('gemini_flash', regenerationPrompt, {
                    maxTokens: 1200,
                    taskType: 'marketing_regenerate',
                }));
                const regeneratedContent = parseCouncilResponse(aiResponseText);

                if (!regeneratedContent || !regeneratedContent.content_text) {
                    throw new Error('AI regeneration response was invalid.');
                }

                const updateResult = await pool.query(
                    `UPDATE marketing_content_pieces SET content_text = $1, status = 'draft', regeneration_count = COALESCE(regeneration_count, 0) + 1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                    [regeneratedContent.content_text, id]
                );
                updatedPiece = updateResult.rows[0];
            }

            res.status(200).json({ ok: true, piece: updatedPiece });
        } catch (error) {
            logger.error(`Error in PATCH /api/v1/marketing/content/${req.params.id}:`, error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // GET /api/v1/marketing/sessions/:id/export
    router.get('/sessions/:id/export', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { id } = req.params;
            if (!isFounderBypass(req)) {
                const paid = await sessionIsPaid(pool, id);
                if (!paid) {
                    return res.status(402).json({
                        ok: false,
                        error: 'payment_required',
                        hint: 'Buy the $49 content pack to unlock download.',
                        checkout: `/marketing/session/${id}/export`,
                    });
                }
            }

            const approvedPiecesResult = await pool.query(
                `SELECT p.title, p.platform, p.format, p.content_text FROM marketing_content_pieces p INNER JOIN marketing_sessions s ON s.id = p.session_id WHERE p.session_id = $1 AND s.owner_id = $2 AND p.status = 'approved' ORDER BY p.created_at ASC`,
                [id, owner_id]
            );

            if (approvedPiecesResult.rows.length === 0) {
                return res.status(404).json({ ok: false, error: 'No approved content found for this session.' });
            }

            let exportText = `Marketing Content Export for Session ID: ${id}\n\n`;
            approvedPiecesResult.rows.forEach((piece, index) => {
                exportText += `--- Piece ${index + 1} ---\n`;
                exportText += `Title: ${piece.title || 'Untitled'}\n`;
                exportText += `Platform: ${piece.platform}\n`;
                exportText += `Format: ${piece.format}\n`;
                exportText += `Content:\n${piece.content_text}\n\n`;
            });

            res.setHeader('Content-Disposition', `attachment; filename="marketing-content-session-${id}.txt"`);
            res.setHeader('Content-Type', 'text/plain');
            res.status(200).send(exportText);
        } catch (error) {
            logger.error(`Error in GET /api/v1/marketing/sessions/${req.params.id}/export:`, error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // GET /api/v1/marketing/channel-profile
    router.get('/channel-profile', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            let profileResult = await pool.query(
                `SELECT * FROM marketing_channel_profiles WHERE owner_id = $1`,
                [owner_id]
            );

            if (profileResult.rows.length === 0) {
                // Create a default profile if none exists
                const defaultProfile = {
                    channel_name: null,
                    niche: null,
                    brand_voice_json: { tone: 'informative', style: 'friendly' },
                    audience_json: { demographics: 'general', interests: 'marketing' },
                    posting_cadence_json: { frequency: 'daily', platforms: ['blog', 'social'] }
                };
                const insertResult = await pool.query(
                    `INSERT INTO marketing_channel_profiles (owner_id, channel_name, niche, brand_voice_json, audience_json, posting_cadence_json) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [owner_id, defaultProfile.channel_name, defaultProfile.niche, JSON.stringify(defaultProfile.brand_voice_json), JSON.stringify(defaultProfile.audience_json), JSON.stringify(defaultProfile.posting_cadence_json)]
                );
                profileResult = insertResult;
            }
            res.status(200).json({ ok: true, profile: profileResult.rows[0] });
        } catch (error) {
            logger.error('Error in GET /api/v1/marketing/channel-profile:', error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    // PUT /api/v1/marketing/channel-profile
    router.put('/channel-profile', requireKey, async (req, res) => {
        try {
            const owner_id = getOwnerId(req);
            if (!owner_id) {
                return res.status(400).json({ ok: false, error: 'owner_id is required.' });
            }

            const { channel_name, niche, brand_voice_json, audience_json, posting_cadence_json } = req.body;

            // Ensure JSON fields are valid JSON or null
            const validBrandVoice = brand_voice_json ? JSON.stringify(brand_voice_json) : null;
            const validAudience = audience_json ? JSON.stringify(audience_json) : null;
            const validPostingCadence = posting_cadence_json ? JSON.stringify(posting_cadence_json) : null;

            const updateResult = await pool.query(
                `UPDATE marketing_channel_profiles SET channel_name = $1, niche = $2, brand_voice_json = $3, audience_json = $4, posting_cadence_json = $5, updated_at = NOW() WHERE owner_id = $6 RETURNING *`,
                [channel_name, niche, validBrandVoice, validAudience, validPostingCadence, owner_id]
            );

            if (updateResult.rows.length === 0) {
                return res.status(404).json({ ok: false, error: 'Channel profile not found for update.' });
            }

            res.status(200).json({ ok: true, profile: updateResult.rows[0] });
        } catch (error) {
            logger.error('Error in PUT /api/v1/marketing/channel-profile:', error);
            res.status(500).json({ ok: false, error: error.message });
        }
    });

    app.use('/api/v1/marketing', router);
}

export { getOwnerId };
export default registerMarketingSessionRoutes;