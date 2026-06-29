/**
 * SYNOPSIS: LifeOS Communication OS API routes.
 * LifeOS Communication OS API routes.
 * Conversation-first interface — NOT BuilderOS proof memory.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import express from 'express';
import { createCouncilPromptAdapter } from '../services/council-prompt-adapter.js';
import { buildCommunicationEvidence } from '../services/command-center-communication-service.js';
import {
  COMM_MODES,
  buildHubSnapshot,
  buildIdentityEnvelope,
  buildRevenueBrief,
  enrichEvidence,
  extractStructuredFields,
  inferTags,
  inferTopic,
  insertCommunicationExtended,
  modeFrame,
  normalizeMeetingTurns,
  parseMeetingJson,
  searchCommunications,
} from '../services/lifeos-communication-os-service.js';

export function createLifeOSCommunicationRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();
  const callAI = createCouncilPromptAdapter(callCouncilMember, {
    member: process.env.LIFEOS_COMM_COUNCIL_MEMBER || 'gemini_flash',
    taskType: 'general',
  });

  router.get('/api/v1/lifeos/communication/modes', requireKey, (_req, res) => {
    res.json({ ok: true, modes: COMM_MODES });
  });

  router.get('/api/v1/lifeos/communication/hub', requireKey, async (req, res, next) => {
    try {
      const hub = await buildHubSnapshot(pool);
      res.json({ ok: true, hub });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/communication/search', requireKey, async (req, res, next) => {
    try {
      const rows = await searchCommunications(pool, {
        q: req.query.q,
        tag: req.query.tag,
        mode: req.query.mode,
        hasDisagreement: req.query.disagreements === 'true',
        limit: req.query.limit,
      });
      res.json({ ok: true, count: rows.length, communications: rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/communication/revenue', requireKey, async (req, res, next) => {
    try {
      const brief = await buildRevenueBrief(pool);
      res.json({ ok: true, revenue: brief });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/lifeos/communication/ask', requireKey, async (req, res, next) => {
    try {
      if (!callAI) {
        return res.status(503).json({ ok: false, error: 'Council not configured on server' });
      }

      const {
        transcript,
        mode = 'quick_ask',
        domain = null,
        deploy_sha = null,
        primary_speaker = 'Lumin',
        contributors = [],
      } = req.body || {};

      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ ok: false, error: 'transcript is required' });
      }

      const framed = modeFrame(mode, transcript);
      const endpointsUsed = ['POST /api/v1/lifeos/communication/ask', 'POST /api/v1/lifeos/builder/task'];
      const output = await callAI(framed);

      let evidence = enrichEvidence(buildCommunicationEvidence({
        responseText: output,
        endpointsUsed,
        builderMeta: { advisory_only: true, execution_only: true, model_used: 'council' },
        deploySha: deploy_sha,
      }));

      const structured = extractStructuredFields(output);
      const tags = inferTags({ mode, domain, transcript, responseText: output });
      const identity = buildIdentityEnvelope({
        primarySpeaker: primary_speaker,
        contributors,
        evidence,
        modelUsed: 'council',
      });

      const row = await insertCommunicationExtended(pool, {
        speaker: 'adam',
        council_member: primary_speaker,
        mode,
        domain,
        transcript,
        response_text: output,
        evidence_json: evidence,
        topic: inferTopic(transcript),
        participants: ['adam', primary_speaker, ...contributors],
        contributors,
        decisions: structured.decisions,
        alternatives: structured.alternatives,
        action_items: structured.action_items,
        tags,
        identity_json: identity,
        railway_sha: deploy_sha,
      });

      res.status(201).json({
        ok: true,
        communication: row,
        identity,
        evidence,
        response_text: output,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/lifeos/communication/meeting', requireKey, async (req, res, next) => {
    try {
      if (!callAI) {
        return res.status(503).json({ ok: false, error: 'Council not configured on server' });
      }

      const { transcript, domain = null, deploy_sha = null } = req.body || {};
      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ ok: false, error: 'transcript is required' });
      }

      const endpointsUsed = ['POST /api/v1/lifeos/communication/meeting'];
      const raw = await callAI(modeFrame('meeting', transcript));
      const parsed = parseMeetingJson(raw);
      if (!parsed) {
        return res.status(422).json({
          ok: false,
          error: 'Meeting mode requires structured JSON from council — parse failed',
          raw_preview: String(raw).slice(0, 500),
          evidence_status: 'UNVERIFIED',
        });
      }

      const { turns, disagreements } = normalizeMeetingTurns(parsed, endpointsUsed);
      const combinedText = turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
      let evidence = enrichEvidence(buildCommunicationEvidence({
        responseText: combinedText,
        endpointsUsed,
        builderMeta: { advisory_only: true, execution_only: true },
        deploySha: deploy_sha,
      }), { disagreements });

      if (disagreements.length) evidence.evidence_status = evidence.evidence_status === 'VERIFIED' ? 'PARTIAL' : evidence.evidence_status;

      const tags = inferTags({ mode: 'meeting', domain, transcript, responseText: combinedText });
      if (disagreements.length) tags.push('disagreement');

      const identity = buildIdentityEnvelope({
        primarySpeaker: 'Lumin',
        contributors: turns.map((t) => t.speaker).filter((s) => s !== 'Lumin'),
        evidence,
      });

      const row = await insertCommunicationExtended(pool, {
        speaker: 'adam',
        council_member: 'Meeting',
        mode: 'meeting',
        domain,
        transcript,
        response_text: combinedText,
        evidence_json: evidence,
        topic: inferTopic(transcript),
        participants: ['adam', ...turns.map((t) => t.speaker)],
        contributors: turns.map((t) => t.speaker),
        meeting_transcript: turns,
        tags,
        identity_json: identity,
        railway_sha: deploy_sha,
      });

      res.status(201).json({
        ok: true,
        communication: row,
        meeting: { turns, disagreements },
        identity,
        evidence,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
