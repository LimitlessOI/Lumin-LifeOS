// SYNOPSIS: Express route module for MarketingOS session API.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { Router } from 'express';

const router = Router();

// Helper to extract owner_id
const getOwnerId = (req) => {
    return req.user?.id || req.body.owner_id || req.query.owner_id;
};

// Helper to safely parse JSON from council member
const parseCouncilResponse = (text) => {
    try {
        // Attempt to find JSON array or object within the text
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            return JSON.parse(jsonMatch[1]);
        }
        // Fallback to direct parse if no markdown block
        return JSON.parse(text);
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

            const { consent_type, consent_text } = req.body;

            const validConsentTypes = ['initial', 'terms_update', 'data_sharing']; // Derived from typical consent types
            if (!validConsentTypes.includes(consent_type)) {
                return res.status(400).json({ ok: false, error: 'Invalid consent_type.' });
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
            const { message } = req.body;
            if (!message) {
                return res.status(400).json({ ok: false, error: 'Message is required.' });
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

            const systemPrompt = `You are a marketing coach AI. Your goal is to help the user articulate their marketing goals, target audience, and content ideas. Keep the conversation focused on marketing strategy. Detect "hook moments" when the user mentions specific energy, numbers, or details that could be a compelling hook for content. Respond with a JSON object { "response": "AI's reply", "hookDetected": true/false, "hookText": "Detected hook phrase" }.`;
            const history = coachMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            const fullPrompt = `${systemPrompt}\n\nConversation history:\n${history}\n\nAI:`;

            const aiResponseText = await callCouncilMember('gemini_flash', fullPrompt);
            const aiResponse = parseCouncilResponse(aiResponseText);

            let responseContent = 'An error occurred while processing the AI response.';
            let hookDetected = false;
            let hookText = null;

            if (aiResponse && typeof aiResponse.response === 'string') {
                responseContent = aiResponse.response;
                hookDetected = aiResponse.hookDetected === true;
                hookText = aiResponse.hookText || null;
            } else {
                // If AI doesn't return JSON, assume raw text and try to detect hooks heuristically
                responseContent = aiResponseText;
                if (/(energy|specific|numbers|details)/i.test(responseContent)) { // Simple heuristic
                    hookDetected = true;
                    hookText = responseContent.match(/(energy|specific|numbers|details)/i)?.[0] || null;
                }
            }

            coachMessages.push({ role: 'assistant', content: responseContent });

            await pool.query(
                `UPDATE marketing_sessions SET coach_messages_json = $1 WHERE id = $2 AND owner_id = $3`,
                [JSON.stringify(coachMessages), id, owner_id]
            );

            res.status(200).json({ ok: true, response: responseContent, hookDetected, hookText });
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

            const extractionPrompt = `Given the following marketing coaching session transcript, extract key marketing content items. For each item, identify its type (e.g., "target_audience", "pain_point", "solution", "call_to_action", "benefit", "hook_idea"), the raw text from the transcript, and a confidence score (0-1). Return a JSON array of objects: [{ "extraction_type": "...", "raw_text": "...", "confidence_score": 0.X, "source_quote": "..." }].\n\nTranscript:\n${transcriptText}`;

            const aiResponseText = await callCouncilMember('gemini_flash', extractionPrompt);
            const extractions = parseCouncilResponse(aiResponseText);

            if (!Array.isArray(extractions)) {
                throw new Error('AI extraction response was not a valid JSON array.');
            }

            const validExtractionTypes = ['target_audience', 'pain_point', 'solution', 'call_to_action', 'benefit', 'hook_idea', 'testimonial', 'objection', 'value_proposition']; // Derived from typical content types
            const insertedExtractions = [];

            for (const item of extractions) {
                if (!validExtractionTypes.includes(item.extraction_type)) {
                    logger.warn(`Skipping invalid extraction_type: ${item.extraction_type}`);
                    continue;
                }
                const insertResult = await pool.query(
                    `INSERT INTO marketing_content_extractions (session_id, owner_id, extraction_type, raw_text, confidence_score, source_quote) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [id, owner_id, item.extraction_type, item.raw_text, item.confidence_score, item.source_quote || item.raw_text]
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

            const extractionsResult = await pool.query(
                `SELECT * FROM marketing_content_extractions WHERE session_id = $1 AND owner_id = $2 ORDER BY id ASC`,
                [id, owner_id]
            );
            const extractions = extractionsResult.rows;

            const generatedPieces = [];
            const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'blog', 'email']; // Derived from common platforms
            const validFormats = ['text_post', 'short_video_script', 'long_form_article', 'email_newsletter']; // Derived from common formats

            for (const extraction of extractions) {
                const generationPrompt = `Using the brand voice: ${JSON.stringify(brandVoice)}, generate a marketing content piece based on the following extraction. The piece should be suitable for a social media post or a short article snippet. Extraction type: ${extraction.extraction_type}, Raw text: "${extraction.raw_text}". Focus on creating compelling copy. Return a JSON object: { "platform": "facebook", "format": "text_post", "content_text": "Generated content here" }. Choose a platform and format from: ${validPlatforms.join(', ')} and ${validFormats.join(', ')}.`;

                const aiResponseText = await callCouncilMember('gemini_flash', generationPrompt);
                const generatedContent = parseCouncilResponse(aiResponseText);

                if (generatedContent && generatedContent.content_text) {
                    const platform = validPlatforms.includes(generatedContent.platform) ? generatedContent.platform : 'blog';
                    const format = validFormats.includes(generatedContent.format) ? generatedContent.format : 'text_post';

                    const insertResult = await pool.query(
                        `INSERT INTO marketing_content_pieces (session_id, owner_id, platform, format, content_text, status, generated_by_model, source_extraction_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                        [id, owner_id, platform, format, generatedContent.content_text, 'draft', 'marketing-generator', extraction.id]
                    );
                    generatedPieces.push(insertResult.rows[0]);
                } else {
                    logger.warn(`Failed to generate content for extraction ID ${extraction.id}. AI response: ${aiResponseText}`);
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
                `SELECT * FROM marketing_content_pieces WHERE session_id = $1 AND owner_id = $2 ORDER BY created_at ASC`,
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
                `SELECT * FROM marketing_content_pieces WHERE id = $1 AND owner_id = $2`,
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
                    `UPDATE marketing_content_pieces SET status = 'approved' WHERE id = $1 AND owner_id = $2 RETURNING *`,
                    [id, owner_id]
                );
                updatedPiece = updateResult.rows[0];
            } else if (action === 'reject') {
                const updateResult = await pool.query(
                    `UPDATE marketing_content_pieces SET status = 'rejected' WHERE id = $1 AND owner_id = $2 RETURNING *`,
                    [id, owner_id]
                );
                updatedPiece = updateResult.rows[0];
            } else if (action === 'regenerate') {
                const channelProfileResult = await pool.query(
                    `SELECT brand_voice_json FROM marketing_channel_profiles WHERE owner_id = $1`,
                    [owner_id]
                );
                const brandVoice = channelProfileResult.rows[0]?.brand_voice_json || { tone: 'professional', style: 'direct' };

                const extractionResult = await pool.query(
                    `SELECT raw_text, extraction_type FROM marketing_content_extractions WHERE id = $1 AND owner_id = $2`,
                    [currentPiece.source_extraction_id, owner_id]
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
                    `UPDATE marketing_content_pieces SET content_text = $1, status = 'draft', regeneration_count = COALESCE(regeneration_count, 0) + 1, updated_at = NOW() WHERE id = $2 AND owner_id = $3 RETURNING *`,
                    [regeneratedContent.content_text, id, owner_id]
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
                `SELECT platform, format, content_text FROM marketing_content_pieces WHERE session_id = $1 AND owner_id = $2 AND status = 'approved' ORDER BY created_at ASC`,
                [id, owner_id]
            );

            if (approvedPiecesResult.rows.length === 0) {
                return res.status(404).json({ ok: false, error: 'No approved content found for this session.' });
            }

            let exportText = `Marketing Content Export for Session ID: ${id}\n\n`;
            approvedPiecesResult.rows.forEach((piece, index) => {
                exportText += `--- Piece ${index + 1} ---\n`;
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

export default registerMarketingSessionRoutes;
