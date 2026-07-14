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

// Helper to extract owner_id
const getOwnerId = (req) => {
    return toOwnerUuid(
        req.lifeosUser?.sub
        || req.user?.id
        || req.user?.sub
        || req.body?.owner_id
        || req.query?.owner_id
        || null
    );
};

// Helper to safely parse JSON from council member
const parseCouncilResponse = (text) => {
    try {
        // Attempt to find JSON array or object within the text
        const mdMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (mdMatch && mdMatch[1]) {
            return JSON.parse(mdMatch[1]);
        }
        // Some models return JSON directly without markdown
        const trimmed = String(text || '').trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            return JSON.parse(trimmed);
        }
        // Fallback: find the first JSON array or object in the response
        const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
        if (jsonMatch && jsonMatch[1]) {
            return JSON.parse(jsonMatch[1]);
        }
        return null;
    } catch (e) {
        return null; // Return null if parsing fails
    }
};

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
            const transcriptText = coachMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

            const extractionPrompt = `Given the following marketing coaching session transcript, extract key marketing content items. For each item, identify its type (must be one of: hook, story, teaching, objection, offer, cta, emotional_truth), the raw text from the transcript, and a confidence score (0-1). Return a JSON array of objects: [{ "extraction_type": "...", "raw_text": "...", "confidence_score": 0.X, "source_quote": "..." }].\n\nTranscript:\n${transcriptText}`;

            const aiResponseText = await callCouncilMember('gemini_flash', extractionPrompt);
            const extractions = parseCouncilResponse(aiResponseText);

            if (!Array.isArray(extractions)) {
                throw new Error('AI extraction response was not a valid JSON array.');
            }

            const validExtractionTypes = ['hook', 'story', 'teaching', 'objection', 'offer', 'cta', 'emotional_truth'];
            const insertedExtractions = [];

            for (const item of extractions) {
                if (!validExtractionTypes.includes(item.extraction_type)) {
                    logger.warn(`Skipping invalid extraction_type: ${item.extraction_type}`);
                    continue;
                }
                const insertResult = await pool.query(
                    `INSERT INTO marketing_content_extractions (session_id, extraction_type, raw_text, confidence_score, source_quote) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                    [id, item.extraction_type, item.raw_text, item.confidence_score, item.source_quote || item.raw_text]
                );
                insertedExtractions.push(insertResult.rows[0]);
            }

            res.status(200).json({ ok: true, extractions: insertedExtractions });
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

                const aiResponseText = await callCouncilMember('claude_sonnet', generationPrompt);
                const generatedContents = parseCouncilResponse(aiResponseText);

                const pieces = Array.isArray(generatedContents) ? generatedContents : (generatedContents && generatedContents.content_text ? [generatedContents] : []);

                if (!pieces.length) {
                    logger.warn(`Failed to generate content for extraction ID ${extraction.id}. AI response: ${aiResponseText}`);
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
                        [id, extraction.id, title, platform, format, piece.content_text, 'draft', 'claude_sonnet']
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
            const { action, hint } = req.body;

            const pieceResult = await pool.query(
                `SELECT p.* FROM marketing_content_pieces p INNER JOIN marketing_sessions s ON s.id = p.session_id WHERE p.id = $1 AND s.owner_id = $2`,
                [id, owner_id]
            );
            if (pieceResult.rows.length === 0) {
                return res.status(404).json({ ok: false, error: 'Content piece not found.' });
            }
            const currentPiece = pieceResult.rows[0];

            let updatedPiece;
            const validActions = ['approve', 'reject', 'regenerate']; // Derived from task description
            if (!validActions.includes(action)) {
                return res.status(400).json({ ok: false, error: 'Invalid action.' });
            }

            if (action === 'approve') {
                const updateResult = await pool.query(
                    `UPDATE marketing_content_pieces SET status = 'approved' WHERE id = $1 RETURNING *`,
                    [id]
                );
                updatedPiece = updateResult.rows[0];
            } else if (action === 'reject') {
                const updateResult = await pool.query(
                    `UPDATE marketing_content_pieces SET status = 'rejected' WHERE id = $1 RETURNING *`,
                    [id]
                );
                updatedPiece = updateResult.rows[0];
            } else if (action === 'regenerate') {
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

                const aiResponseText = await callCouncilMember('gemini_flash', regenerationPrompt);
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
