/**
 * SYNOPSIS: LifeRE OS routes — full A-to-Z API (W1–W6).
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import express from 'express';
import { createLifeREOSService } from '../services/lifere-os-v1.js';
import {
  fetchBoldTrailPipeline,
  getBoldTrailConnectionStatus,
  pushApprovedFollowUp,
} from '../services/lifere-boldtrail-bridge.js';
import { createOrUpdateContact, extractCreatedContactId } from '../src/integrations/boldtrail.js';
import { createLifeRETwinStore, ForbiddenCrossUserError } from '../services/lifere-twin-store.js';
import { createLifeREPerformanceTwin } from '../services/lifere-performance-twin.js';
import { createLifeREPermissionTwin } from '../services/lifere-permission-twin.js';
import { createLifeREClientComms } from '../services/lifere-client-comms.js';
import { createLifeRELifeOSCrosscheck } from '../services/lifere-lifeos-crosscheck.js';
import { createLifeREPersonalityCalibration } from '../services/lifere-personality-calibration.js';
import { createLifeRESkillCoaching } from '../services/lifere-skill-coaching.js';
import { createLifeREMarketingModule } from '../services/lifere-marketing-module.js';
import { createLifeREFunnelIngress } from '../services/lifere-funnel-ingress.js';
import { createLifeREYouTubeResearch } from '../services/lifere-youtube-research.js';
import { createLifeRETransactionSurface } from '../services/lifere-transaction-surface.js';
import { createLifeRERecruitingOS } from '../services/lifere-recruiting-os.js';
import { createLifeREFinanceRunway } from '../services/lifere-finance-runway.js';
import { createLifeREOpportunityOS } from '../services/lifere-opportunity-os.js';
import { createLifeREReceptionistBridge } from '../services/lifere-receptionist-bridge.js';
import { createLifeREOutreachBridge } from '../services/lifere-outreach-bridge.js';
import { createLifeREScenarioEngine } from '../services/lifere-scenario-engine.js';
import { createLifeREExperimentEngine } from '../services/lifere-experiment-engine.js';
import { createLifeREBestPracticeEngine } from '../services/lifere-best-practice-engine.js';
import { createLifeRERelationshipTwin } from '../services/lifere-relationship-twin.js';
import { createLifeREFounderExtensions, assertFounderAccess } from '../services/lifere-founder-extensions.js';
import { createLifeRECouncilRouter } from '../services/lifere-council-router.js';
import { createLifeREDealSideOS } from '../services/lifere-deal-side-os.js';
import { createLifeREFollowUpOS } from '../services/lifere-follow-up-os.js';
import { createLifeRELearningPipeline } from '../services/lifere-learning-pipeline.js';
import { createLifeREChairService } from '../services/lifere-chair-service.js';
import { createLifeRECommandCenter } from '../services/lifere-command-center.js';
import { createLifeREAlphaDailyCycle } from '../services/lifere-alpha-daily-cycle.js';
import { createLifeREFounderAttempt } from '../services/lifere-founder-attempt.js';
import { getLifeREAlphaReadinessSurface } from '../services/lifere-alpha-readiness-surface.js';
import { confirmAndPersistFounderUsability } from '../services/lifere-founder-usability-persist.js';
import { createLifeRESocialMediaOSBridge } from '../services/lifere-socialmediaos-bridge.js';
import { pickModel } from '../services/lifere-model-router.js';
import { createLifeREAlphaSurfaceAPI } from '../services/lifere-alpha-surface-api.js';

function userId(req) {
  return req.body?.user_id || req.query?.user_id || 'adam';
}

function tenantId(req) {
  return req.body?.tenant_id || req.query?.tenant_id || 'default';
}

export function createLifeRERoutes({ requireKey, pool = null, logger = console, callCouncilMember = null, notificationService = null, sendSMS = null, commitManyToGitHub = null }) {
  const router = express.Router();
  const service = createLifeREOSService();
  const twinStore = createLifeRETwinStore({ pool, logger });
  const performance = createLifeREPerformanceTwin({ pool });
  const permission = createLifeREPermissionTwin({ pool });
  const outreach = createLifeREOutreachBridge({ pool, notificationService, sendSMS, logger });
  const clientComms = createLifeREClientComms({ pool, outreach, logger });
  const lifeosCrosscheck = createLifeRELifeOSCrosscheck({ pool });
  const personality = createLifeREPersonalityCalibration({ pool });
  const coaching = createLifeRESkillCoaching({ pool });
  const marketing = createLifeREMarketingModule({ pool });
  const funnel = createLifeREFunnelIngress({ pool });
  const youtube = createLifeREYouTubeResearch();
  const transaction = createLifeRETransactionSurface({ pool });
  const recruiting = createLifeRERecruitingOS({ pool });
  const finance = createLifeREFinanceRunway({ pool });
  const opportunity = createLifeREOpportunityOS({ pool });
  const receptionist = createLifeREReceptionistBridge({ pool, logger });
  const scenario = createLifeREScenarioEngine({ pool });
  const experiment = createLifeREExperimentEngine({ pool });
  const bestPractice = createLifeREBestPracticeEngine();
  const relationship = createLifeRERelationshipTwin({ pool });
  const founder = createLifeREFounderExtensions();
  const council = createLifeRECouncilRouter({ callCouncilMember, logger });
  const dealSide = createLifeREDealSideOS({ pool });
  const followUpOS = createLifeREFollowUpOS({ pool });
  const commandCenter = createLifeRECommandCenter({ pool, logger });
  const chairService = createLifeREChairService({ pool });
  const learning = createLifeRELearningPipeline({ pool });
  const alphaCycle = createLifeREAlphaDailyCycle({ pool, logger });
  const founderAttempt = createLifeREFounderAttempt({ pool, logger });
  const socialMediaOS = createLifeRESocialMediaOSBridge({ pool, notificationService, sendSMS, callCouncilMember, logger });
  const alphaSurface = createLifeREAlphaSurfaceAPI({
    pool,
    followUpOS,
    funnel,
    marketing,
    clientComms,
    lifeosCrosscheck,
    opportunity,
    youtube,
  });

  router.get('/health', requireKey, (_req, res) => {
    res.json({
      ...service.health(),
      waves: 'W1-W6+SMO',
      pool: !!pool,
      council_live: !!callCouncilMember,
      integrations: ['am08_outreach', 'am17_tc', 'am29_receptionist', 'am41_socialmediaos', 'vapi_ingest', 'boldtrail'],
    });
  });

  router.get('/health/deep', requireKey, async (_req, res) => {
    const tables = [
      'lifere_activity_log', 'lifere_approval_queue', 'lifere_call_logs',
      'lifere_experiments', 'lifere_performance_snapshot', 'lifere_content_briefs',
    ];
    const pgTables = {};
    if (pool) {
      for (const t of tables) {
        try {
          const { rows } = await pool.query(
            `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1) AS ok`,
            [t],
          );
          pgTables[t] = rows[0]?.ok === true;
        } catch {
          pgTables[t] = false;
        }
      }
    }
    res.json({
      ok: true,
      pool: !!pool,
      pg_tables: pgTables,
      pg_ready: pool ? Object.values(pgTables).every(Boolean) : null,
      label: pool && Object.values(pgTables).every(Boolean) ? 'KNOW' : 'THINK',
    });
  });

  router.post('/alpha/daily-cycle', requireKey, async (req, res) => {
    try {
      const result = await alphaCycle.runDailyCycle({
        userId: userId(req),
        tenantId: tenantId(req),
        goalGci: Number(req.body?.goal_gci) || 30000,
        activityCounts: req.body?.activity_counts,
        debriefNotes: req.body?.debrief_notes,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/alpha/founder-attempt', requireKey, async (req, res) => {
    try {
      const result = await founderAttempt.recordAttempt({
        userId: userId(req),
        tenantId: tenantId(req),
        goalGci: Number(req.body?.goal_gci) || 30000,
        activityCounts: req.body?.activity_counts,
        debriefNotes: req.body?.debrief_notes || 'Founder alpha attempt',
        source: req.body?.source || 'api',
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/alpha/readiness', requireKey, async (_req, res) => {
    try {
      const deep = await pool?.query?.(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lifere_activity_log') AS ok`
      ).catch(() => null);
      const pgOk = deep?.rows?.[0]?.ok === true;
      res.json(getLifeREAlphaReadinessSurface({ pool: Boolean(pool), pgTablesOk: pgOk }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/alpha/confirm-usability', requireKey, async (req, res) => {
    try {
      const pass = req.body?.pass === true || req.body?.pass === 'true';
      const result = await confirmAndPersistFounderUsability({
        missionId: req.body?.mission_id || 'PRODUCT-LIFERE-OS-V1-0001',
        pass,
        quote: req.body?.quote || req.body?.founder_quote || '',
        actor: req.body?.actor || userId(req),
        commitManyToGitHub,
      });
      if (!result.ok) {
        return res.status(400).json(result);
      }
      res.json({
        ...result,
        readiness: getLifeREAlphaReadinessSurface({ pool: Boolean(pool), pgTablesOk: null }),
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/follow-up/queue', requireKey, async (req, res) => {
    try {
      const queue = await followUpOS.prioritizeQueue({
        userId: userId(req),
        limit: Number(req.query.limit) || 10,
      });
      res.json({ ok: true, queue, count: queue.length });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/follow-up/metrics', requireKey, async (req, res) => {
    try {
      res.json(await alphaSurface.getFollowUpMetrics({
        userId: userId(req),
        tenantId: tenantId(req),
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/boldtrail/status', requireKey, async (_req, res) => {
    try {
      res.json({ ok: true, boldtrail: await getBoldTrailConnectionStatus() });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/boldtrail/pipeline', requireKey, async (req, res) => {
    try {
      const pipeline = await fetchBoldTrailPipeline({
        limit: Number(req.query.limit) || 50,
        assignedAgentId: req.query.assigned_agent_id || null,
      });
      res.json({
        ok: pipeline.ok,
        connected: pipeline.connected,
        contacts: pipeline.contacts || [],
        summary: pipeline.summary || null,
        result: pipeline,
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/boldtrail/contacts', requireKey, async (req, res) => {
    try {
      const { name, first_name, last_name, email, phone, source, meta, note, tags } = req.body || {};
      if (!name && !email && !phone) {
        return res.status(400).json({ ok: false, error: 'name, email, or phone required' });
      }
      const result = await createOrUpdateContact({
        name,
        first_name,
        last_name,
        email,
        phone,
        source: source || 'LifeRE',
        note: note || (meta?.note ? String(meta.note) : undefined),
        tags: tags || (meta?.alpha ? ['LifeRE-alpha'] : undefined),
        meta: meta || { created_by: 'lifere_api', alpha: true },
      });
      if (!result.ok) {
        return res.status(result.status || 503).json({
          ok: false,
          error: result.reason || result.error || 'boldtrail_create_failed',
          status: result.status || null,
          detail: result.data || null,
          endpoint: result.endpoint || null,
        });
      }
      const contactId = result.contact_id || extractCreatedContactId(result.data);
      res.status(201).json({
        ok: true,
        contact_id: contactId,
        boldtrail: result.data,
        endpoint: result.endpoint || null,
        raw_status: result.status,
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/daily-command-center', requireKey, async (req, res) => {
    try {
      const result = await commandCenter.buildDailyCommandCenter(req.body || {});
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/chair/brief', requireKey, async (req, res) => {
    try {
      const brief = await chairService.answerChairBrief({
        userId: userId(req),
        tenantId: tenantId(req),
        goalGci: Number(req.query.goal_gci) || 30000,
      });
      res.json(brief);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/top-3', requireKey, (req, res) => {
    res.json({ ok: true, result: service.top3Priorities(req.query || {}) });
  });

  router.post('/top-3', requireKey, (req, res) => {
    res.json({ ok: true, result: service.top3Priorities(req.body || {}) });
  });

  router.post('/nightly-debrief', requireKey, (req, res) => {
    res.json({ ok: true, result: service.nightlyDebrief(req.body || {}) });
  });

  router.post('/education/context', requireKey, (req, res) => {
    res.json({ ok: true, result: service.educationContext(req.body || {}) });
  });

  router.get('/education/progress', requireKey, (req, res) => {
    try {
      res.json(alphaSurface.readEducationProgress(tenantId(req), userId(req)));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/education/curriculum', requireKey, (_req, res) => {
    res.json(alphaSurface.getEducationCurriculum());
  });

  router.post('/education/complete', requireKey, async (req, res) => {
    try {
      const result = await alphaSurface.completeEducationModule({
        tenantId: tenantId(req),
        userId: userId(req),
        moduleId: req.body?.module_id,
        score: req.body?.score,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.get('/motivation/milestones', requireKey, async (req, res) => {
    try {
      res.json(await alphaSurface.getMotivationState({
        tenantId: tenantId(req),
        userId: userId(req),
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/lifeos/integration', requireKey, async (req, res) => {
    try {
      res.json(await alphaSurface.getLifeOSIntegration({
        tenantId: tenantId(req),
        userId: userId(req),
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/sales/coach', requireKey, (req, res) => {
    res.json({ ok: true, result: service.salesCoach(req.body || {}) });
  });

  router.post('/social/lite', requireKey, (req, res) => {
    res.json({ ok: true, result: service.socialLite(req.body || {}) });
  });

  router.post('/follow-up/lite', requireKey, async (req, res) => {
    try {
      const pipeline = await fetchBoldTrailPipeline({ limit: 25 });
      if (pipeline.ok && pipeline.contacts.length) {
        const queue = pipeline.contacts.slice(0, 10).map((contact, index) => ({
          rank: index + 1,
          lead: contact.name,
          contact_id: contact.id,
          status_label: contact.status_label,
          message_draft: `Hey ${contact.name.split(' ')[0] || 'there'}, wanted to make sure you got the options I sent.`,
          execute_external: false,
          requires_agent_approval: true,
          source: 'boldtrail',
        }));
        res.json({ ok: true, result: { queue, source: 'boldtrail' } });
        return;
      }
      res.json({ ok: true, result: service.followUpLite(req.body || {}) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/follow-up/approve', requireKey, async (req, res) => {
    try {
      const { contact_id, message, agent_label } = req.body || {};
      const result = await pushApprovedFollowUp({
        contactId: contact_id,
        message,
        agentLabel: agent_label || 'LifeRE',
      });
      if (!result.ok) {
        res.status(result.error === 'BoldTrail API not configured' ? 503 : 400).json(result);
        return;
      }
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/tc/extract-lite', requireKey, (req, res) => {
    res.json({ ok: true, result: service.tcExtractionLite(req.body || {}) });
  });

  router.post('/compliance/guardrails', requireKey, (req, res) => {
    res.json({ ok: true, result: service.complianceGuardrails(req.body || {}) });
  });

  router.post('/recruiting/lite', requireKey, (req, res) => {
    res.json({ ok: true, result: service.recruitingLite(req.body || {}) });
  });

  router.post('/finance/lite', requireKey, (req, res) => {
    res.json({ ok: true, result: service.financeLite(req.body || {}) });
  });

  router.post('/accountability', requireKey, (req, res) => {
    res.json({ ok: true, result: service.accountability(req.body || {}) });
  });

  router.post('/activity/log', requireKey, async (req, res) => {
    try {
      const uid = userId(req);
      const result = await performance.recordActivity({
        tenantId: tenantId(req),
        userId: uid,
        date: req.body?.date,
        counts: req.body?.counts || req.body,
      });
      res.json({ ok: true, row: result.row });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/performance/ingest-boldtrail', requireKey, async (req, res) => {
    try {
      res.json(await performance.ingestFromBoldTrail({
        tenantId: tenantId(req),
        userId: userId(req),
        date: req.body?.date,
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/performance/snapshot', requireKey, async (req, res) => {
    try {
      const snapshot = await performance.buildSnapshot({
        tenantId: tenantId(req),
        userId: userId(req),
        windowDays: Number(req.query.window_days) || 30,
        goalGci: Number(req.query.goal_gci) || 30000,
      });
      res.json({ ok: true, snapshot, label: snapshot.label });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/performance/bottleneck', requireKey, async (req, res) => {
    try {
      const funnel = await performance.computeFunnel({ tenantId: tenantId(req), userId: userId(req) });
      const rates = performance.computeConversionRates(funnel);
      const bottleneck = performance.findBottleneck(rates, funnel);
      res.json({ ok: true, bottleneck });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/performance/next-hour', requireKey, async (req, res) => {
    try {
      const funnel = await performance.computeFunnel({ tenantId: tenantId(req), userId: userId(req) });
      const rates = performance.computeConversionRates(funnel);
      const bottleneck = performance.findBottleneck(rates, funnel);
      let boldtrailTop3 = [];
      try {
        const pipeline = await fetchBoldTrailPipeline({ limit: 3 });
        boldtrailTop3 = pipeline.contacts || [];
      } catch { /* optional */ }
      const recommendation = performance.recommendNextHour({ bottleneck, boldtrailTop3 });
      const cross = await lifeosCrosscheck.crosscheckBeforeRecommend({
        userId: userId(req),
        businessRecommendation: recommendation,
      });
      res.json({ ok: true, recommendation: cross.recommendation, tradeoff: cross.tradeoff_prose });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/performance/goal-math', requireKey, async (req, res) => {
    try {
      const funnel = await performance.computeFunnel({ tenantId: tenantId(req), userId: userId(req) });
      const rates = performance.computeConversionRates(funnel);
      const goal = performance.activitiesToGoal({
        rates,
        goalGci: Number(req.query.goal_gci) || 30000,
      });
      res.json({ ok: true, activities_to_goal: goal, label: goal.label });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/performance/skill-delta', requireKey, (req, res) => {
    const result = performance.skillDeltaImpact({
      baselineRate: Number(req.body?.baseline_rate) || 0.08,
      improvedRate: Number(req.body?.improved_rate) || 0.12,
      goalGci: Number(req.body?.goal_gci) || 30000,
    });
    res.json({ ok: true, conversations_saved: result.conversations_saved, result });
  });

  router.get('/twins/summary', requireKey, (req, res) => {
    try {
      res.json(twinStore.listTwinsSummary({
        tenantId: tenantId(req),
        userId: userId(req),
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/twins/:twinKey', requireKey, (req, res) => {
    try {
      const data = twinStore.readTwin({
        tenantId: tenantId(req),
        userId: userId(req),
        twinKey: req.params.twinKey,
        requesterId: userId(req),
      });
      res.json({ ok: true, twin: data });
    } catch (error) {
      res.status(error.code === 'FORBIDDEN_CROSS_USER' ? 403 : 500).json({ ok: false, error: error.message });
    }
  });

  router.put('/twins/:twinKey', requireKey, async (req, res) => {
    try {
      const result = await twinStore.writeTwin({
        tenantId: tenantId(req),
        userId: userId(req),
        twinKey: req.params.twinKey,
        payload: req.body?.payload || req.body,
        receiptMeta: req.body?.receipt_meta || {},
        requesterId: userId(req),
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(error.code === 'FORBIDDEN_CROSS_USER' ? 403 : 500).json({ ok: false, error: error.message });
    }
  });

  router.get('/permissions/list', requireKey, async (req, res) => {
    try {
      res.json(await permission.listGrants({
        tenantId: tenantId(req),
        userId: userId(req),
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/permissions/:actionType', requireKey, async (req, res) => {
    const level = await permission.getAutonomyLevel({
      tenantId: tenantId(req),
      userId: userId(req),
      actionType: req.params.actionType,
    });
    res.json({ ok: true, ...level });
  });

  router.put('/permissions/:actionType', requireKey, async (req, res) => {
    try {
      const result = await permission.setAutonomyLevel({
        tenantId: tenantId(req),
        userId: userId(req),
        actionType: req.params.actionType,
        autonomyLevel: req.body?.autonomy_level ?? req.body?.level,
        grantedBy: req.body?.granted_by || userId(req),
        bounds: req.body?.bounds || {},
      });
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/approval-queue', requireKey, async (req, res) => {
    const result = await clientComms.queueDraft({
      tenantId: tenantId(req),
      userId: userId(req),
      actionType: req.body?.action_type || 'sms_client',
      draft: req.body?.draft_text || req.body?.draft,
      payload: req.body?.payload || {},
    });
    res.json({ ok: true, result });
  });

  router.get('/approval-queue', requireKey, async (req, res) => {
    if (!pool) return res.json({ ok: true, items: [] });
    const { rows } = await pool.query(
      `SELECT * FROM lifere_approval_queue WHERE tenant_id = $1 AND user_id = $2 AND status = 'pending' ORDER BY created_at DESC`,
      [tenantId(req), userId(req)]
    );
    res.json({ ok: true, items: rows });
  });

  router.post('/approval-queue/:id/resolve', requireKey, async (req, res) => {
    try {
      const status = req.body?.status === 'rejected' ? 'rejected' : 'approved';
      const result = await clientComms.resolveQueueItem({
        queueId: req.params.id,
        tenantId: tenantId(req),
        userId: userId(req),
        status,
      });
      if (!result.ok) {
        res.status(404).json(result);
        return;
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/client-comms/draft', requireKey, async (req, res) => {
    const rendered = clientComms.renderTemplate({
      templateId: req.body?.template_id,
      channel: req.body?.channel || 'sms',
      vars: req.body?.vars || {},
    });
    const queued = await clientComms.queueDraft({
      tenantId: tenantId(req),
      userId: userId(req),
      actionType: req.body?.action_type || `${req.body?.channel || 'sms'}_client`,
      draft: rendered.body,
      payload: {
        template_id: rendered.template_id,
        channel: rendered.channel,
        recipient_name: req.body?.vars?.client_name,
        recipient_phone: req.body?.recipient_phone || req.body?.vars?.recipient_phone,
        recipient_email: req.body?.recipient_email || req.body?.vars?.recipient_email,
        contact_id: req.body?.contact_id,
      },
    });
    res.json({ ok: true, rendered, queued });
  });

  router.get('/lifeos/crosscheck', requireKey, async (req, res) => {
    const result = await lifeosCrosscheck.crosscheckBeforeRecommend({
      userId: userId(req),
      businessRecommendation: { action: req.query.action || 'prospecting_block' },
    });
    res.json({ ok: true, ...result });
  });

  router.post('/personality/calibrate', requireKey, async (req, res) => {
    try {
      const result = await personality.recordDraftRating({
        tenantId: tenantId(req),
        userId: userId(req),
        draftText: req.body?.draft_text || req.body?.sample || '',
        rating: Number(req.body?.rating ?? 5),
        feedback: req.body?.feedback || '',
      });
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/coaching/modules', requireKey, (_req, res) => {
    res.json({ ok: true, ...coaching.listModules() });
  });

  router.post('/coaching/drill/start', requireKey, async (req, res) => {
    try {
      const result = await coaching.startDrill({
        tenantId: tenantId(req),
        userId: userId(req),
        moduleId: req.body?.module_id,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post('/coaching/drill/complete', requireKey, async (req, res) => {
    const result = await coaching.completeDrill({
      tenantId: tenantId(req),
      userId: userId(req),
      moduleId: req.body?.module_id,
      score: Number(req.body?.score),
      durationMinutes: Number(req.body?.duration_minutes) || 15,
      debrief: req.body?.debrief,
    });
    res.json({ ok: true, result });
  });

  router.get('/coaching/skill-impact', requireKey, (req, res) => {
    res.json({
      ok: true,
      impact: coaching.skillImpact({
        baselineRate: Number(req.query.baseline_rate) || 0.08,
        improvedRate: Number(req.query.improved_rate) || 0.12,
      }),
    });
  });

  router.get('/marketing/video-types', requireKey, (_req, res) => {
    res.json({ ok: true, ...marketing.getVideoTypes() });
  });

  router.post('/marketing/research/hooks/csv', requireKey, async (req, res) => {
    const result = await marketing.importHooksFromCsv({
      tenantId: tenantId(req),
      userId: userId(req),
      hooks: req.body?.hooks || req.body?.rows || [],
    });
    res.json(result);
  });

  router.get('/client-comms/templates', requireKey, (_req, res) => {
    res.json({ ok: true, templates: Object.keys(clientComms.templates || {}) });
  });

  router.get('/client-comms/suggest-vars', requireKey, async (req, res) => {
    try {
      const result = await clientComms.suggestVarsFromDeal({
        dealSide,
        transaction,
        tenantId: tenantId(req),
        userId: userId(req),
        ref: req.query.ref || req.query.client_ref || req.query.deal_id,
        side: req.query.side || 'buyer',
      });
      if (!result.ok) {
        const code = result.error === 'client_not_found' || result.error === 'listing_not_found' ? 404 : 400;
        return res.status(code).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/client-comms/preview', requireKey, (req, res) => {
    try {
      res.json(alphaSurface.previewClientComms({
        templateId: req.body?.template_id,
        channel: req.body?.channel || 'sms',
        vars: req.body?.vars || {},
      }));
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.get('/experiments/playbook', requireKey, (_req, res) => {
    res.json(bestPractice.listPlaybook());
  });

  router.post('/marketing/research/hooks', requireKey, async (req, res) => {
    const result = await marketing.researchHooks({
      tenantId: tenantId(req),
      userId: userId(req),
      niche: req.body?.niche,
      market: req.body?.market,
      count: Number(req.body?.count) || 10,
    });
    res.json(result);
  });

  router.post('/marketing/research/youtube', requireKey, async (req, res) => {
    const result = await youtube.analyzeChannel({
      channelUrl: req.body?.channel_url,
      query: req.body?.query,
    });
    res.status(result.status || 200).json(result);
  });

  router.post('/marketing/youtube/strategy', requireKey, async (req, res) => {
    try {
      res.json(await alphaSurface.youtubeStrategy({
        market: req.body?.market || 'local',
        userId: userId(req),
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/marketing/recording-coach', requireKey, (req, res) => {
    res.json(alphaSurface.recordingCoach({
      scriptOutline: req.body?.script_outline,
      scriptExcerpt: req.body?.script_excerpt,
    }));
  });

  router.post('/marketing/thumbnail-seo', requireKey, (req, res) => {
    res.json(alphaSurface.thumbnailSeo({
      videoTypeId: req.body?.video_type_id,
      hookText: req.body?.hook_text,
      city: req.body?.city || req.body?.market || 'local',
    }));
  });

  router.get('/marketing/funnel/summary', requireKey, async (req, res) => {
    try {
      res.json(await alphaSurface.getFunnelSummary({
        tenantId: tenantId(req),
        userId: userId(req),
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/marketing/funnel/events', requireKey, async (req, res) => {
    try {
      res.json(await alphaSurface.listFunnelEvents({
        tenantId: tenantId(req),
        userId: userId(req),
        limit: req.query.limit,
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/marketing/hooks/library', requireKey, async (req, res) => {
    try {
      res.json(await alphaSurface.listHookLibrary({
        tenantId: tenantId(req),
        userId: userId(req),
        limit: req.query.limit,
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/market/snapshot', requireKey, (req, res) => {
    res.json(alphaSurface.getMarketSnapshot({ market: req.query.market || 'local' }));
  });

  router.get('/market/content-angles', requireKey, (req, res) => {
    res.json(alphaSurface.getMarketContentAngles({
      market: req.query.market || 'local',
      userId: userId(req),
    }));
  });

  router.post('/marketing/script/generate', requireKey, async (req, res) => {
    try {
      const gate = await socialMediaOS.briefEngine.assertApprovedBrief({
        tenantId: tenantId(req),
        userId: userId(req),
        briefId: req.body?.brief_id,
        bypass: req.body?.bypass_brief_gate === true,
      });
      if (!gate.ok) {
        return res.status(428).json(gate);
      }
      const result = await marketing.generateScript({
        tenantId: tenantId(req),
        userId: userId(req),
        videoTypeId: req.body?.video_type_id,
        hookText: req.body?.hook_id || req.body?.hook_text,
      });
      res.json({ ...result, brief_id: gate.brief_id || req.body?.brief_id });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post('/marketing/content-brief/generate', requireKey, async (req, res) => {
    try {
      res.json(await socialMediaOS.briefEngine.generateBrief({
        tenantId: tenantId(req),
        userId: userId(req),
        topic: req.body?.topic,
        persona: req.body?.persona || {},
        competitors: req.body?.competitors || [],
        platforms: req.body?.platforms || req.body?.target_platforms,
        market: req.body?.market,
      }));
    } catch (error) {
      const code = /lifere_content_briefs|does not exist/i.test(error.message) ? 503 : 400;
      res.status(code).json({ ok: false, error: error.message, code: 'content_brief_failed' });
    }
  });

  router.post('/marketing/content-brief/:id/approve', requireKey, async (req, res) => {
    try {
      res.json(await socialMediaOS.briefEngine.approveBrief({
        tenantId: tenantId(req),
        userId: userId(req),
        briefId: req.params.id,
        approvedBy: req.body?.approved_by || userId(req),
      }));
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.get('/marketing/content-brief', requireKey, async (req, res) => {
    res.json(await socialMediaOS.briefEngine.listBriefs({
      tenantId: tenantId(req),
      userId: userId(req),
      limit: Number(req.query?.limit) || 10,
    }));
  });

  router.get('/marketing/content-brief/:id', requireKey, async (req, res) => {
    const brief = await socialMediaOS.briefEngine.getBriefById({
      tenantId: tenantId(req),
      userId: userId(req),
      briefId: req.params.id,
    });
    if (!brief) return res.status(404).json({ ok: false, error: 'brief not found' });
    res.json({ ok: true, brief });
  });

  router.post('/marketing/calendar/plan', requireKey, async (req, res) => {
    const result = await marketing.planCalendar({
      tenantId: tenantId(req),
      userId: userId(req),
      weeks: Number(req.body?.weeks) || 2,
      channels: req.body?.channels || ['youtube', 'facebook'],
    });
    res.json(result);
  });

  router.get('/marketing/calendar', requireKey, async (req, res) => {
    const result = await marketing.listCalendar({ tenantId: tenantId(req), userId: userId(req) });
    res.json(result);
  });

  router.post('/marketing/social/suggest-reply', requireKey, async (req, res) => {
    const result = await socialMediaOS.suggestSocialReply({
      userId: userId(req),
      tenantId: tenantId(req),
      platform: req.body?.platform || 'facebook',
      context: req.body?.context,
      mode: req.body?.platform === 'dm' ? 'dm' : 'comment',
    });
    res.json(result);
  });

  router.get('/marketing/socialmediaos/status', requireKey, async (_req, res) => {
    res.json(await socialMediaOS.status());
  });

  router.post('/marketing/socialmediaos/coach', requireKey, async (req, res) => {
    res.json(await socialMediaOS.coachSession({
      userId: userId(req),
      tenantId: tenantId(req),
      message: req.body?.message,
      history: req.body?.history || [],
      briefId: req.body?.brief_id,
      bypassBriefGate: req.body?.bypass_brief_gate === true,
    }));
  });

  router.post('/marketing/socialmediaos/content-pack', requireKey, async (req, res) => {
    res.json(await socialMediaOS.transcriptToContentPack({
      transcript: req.body?.transcript,
      userId: userId(req),
      tenantId: tenantId(req),
      niche: req.body?.niche || 'real_estate',
    }));
  });

  router.post('/marketing/socialmediaos/queue-post', requireKey, async (req, res) => {
    res.json(await socialMediaOS.queueContentPost({
      userId: userId(req),
      tenantId: tenantId(req),
      body: req.body?.body,
      channel: req.body?.channel || 'facebook',
      platform: req.body?.platform,
    }));
  });

  router.post('/marketing/socialmediaos/pipeline', requireKey, async (req, res) => {
    res.json(await socialMediaOS.runPipeline({
      userId: userId(req),
      tenantId: tenantId(req),
      coachMessage: req.body?.coach_message,
      transcript: req.body?.transcript,
      videoTypeId: req.body?.video_type_id || 'market_update_60',
      briefId: req.body?.brief_id,
      bypassBriefGate: req.body?.bypass_brief_gate === true,
    }));
  });

  router.post('/marketing/funnel/webhook', async (req, res) => {
    const result = await funnel.handleClickFunnelsWebhook({
      secret: req.headers['x-webhook-secret'],
      body: req.body,
      userId: userId(req),
    });
    res.status(result.status || (result.ok ? 200 : 400)).json(result);
  });

  router.get('/marketing/ads/roi', requireKey, async (req, res) => {
    const result = await marketing.adsRoi({
      tenantId: tenantId(req),
      userId: userId(req),
      periodStart: req.query.period_start,
      periodEnd: req.query.period_end,
    });
    res.json(result);
  });

  router.get('/buyer/:clientRef', requireKey, async (req, res) => {
    res.json(await dealSide.getBuyer({ tenantId: tenantId(req), userId: userId(req), clientRef: req.params.clientRef }));
  });

  router.get('/buyer/:clientRef/workspace', requireKey, async (req, res) => {
    try {
      const result = await dealSide.getBuyerWorkspace({
        tenantId: tenantId(req),
        userId: userId(req),
        clientRef: req.params.clientRef,
      });
      if (!result.ok && (result.error === 'client_not_found')) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/buyer/:clientRef/objection-coach', requireKey, async (req, res) => {
    try {
      const result = await dealSide.coachObjection({
        tenantId: tenantId(req),
        userId: userId(req),
        clientRef: req.params.clientRef,
        objection: req.body?.objection || req.body?.text || '',
      });
      if (!result.ok && result.error === 'client_not_found') {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.put('/buyer/:clientRef', requireKey, async (req, res) => {
    res.json(await dealSide.upsertBuyer({
      tenantId: tenantId(req),
      userId: userId(req),
      clientRef: req.params.clientRef,
      patch: req.body?.patch || req.body,
    }));
  });

  router.get('/seller/:listingRef', requireKey, async (req, res) => {
    res.json(await dealSide.getSeller({ tenantId: tenantId(req), userId: userId(req), listingRef: req.params.listingRef }));
  });

  router.get('/seller/:listingRef/workspace', requireKey, async (req, res) => {
    try {
      const result = await dealSide.getSellerWorkspace({
        tenantId: tenantId(req),
        userId: userId(req),
        listingRef: req.params.listingRef,
      });
      if (!result.ok && result.error === 'listing_not_found') {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/seller/:listingRef/weekly-report', requireKey, async (req, res) => {
    try {
      const result = await dealSide.generateWeeklyReport({
        tenantId: tenantId(req),
        userId: userId(req),
        listingRef: req.params.listingRef,
      });
      if (!result.ok && result.error === 'listing_not_found') {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.put('/seller/:listingRef', requireKey, async (req, res) => {
    res.json(await dealSide.upsertSeller({
      tenantId: tenantId(req),
      userId: userId(req),
      listingRef: req.params.listingRef,
      patch: req.body?.patch || req.body,
    }));
  });

  router.get('/transaction/list', requireKey, async (_req, res) => {
    res.json(await transaction.listActiveDeals());
  });

  router.get('/transaction/workspace', requireKey, async (req, res) => {
    try {
      res.json(await transaction.getWorkspace({
        limit: Number(req.query.limit) || 20,
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/transaction/:dealId', requireKey, async (req, res) => {
    const detail = req.query.detail === '1' || req.query.detail === 'true';
    if (detail) {
      return res.json(await transaction.getDealDetail({ dealId: req.params.dealId }));
    }
    const result = await transaction.getDealStatus({ dealId: req.params.dealId });
    res.json(result);
  });

  router.post('/deals/buyers/sync-boldtrail', requireKey, async (req, res) => {
    try {
      res.json(await dealSide.syncBuyersFromBoldTrail({
        tenantId: tenantId(req),
        userId: userId(req),
        limit: Number(req.body?.limit) || 25,
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/deals/buyers', requireKey, async (req, res) => {
    res.json(await dealSide.listBuyerClients({ tenantId: tenantId(req), userId: userId(req) }));
  });

  router.get('/deals/sellers', requireKey, async (req, res) => {
    res.json(await dealSide.listSellerListings({ tenantId: tenantId(req), userId: userId(req) }));
  });

  router.post('/deals/buyers/:ref/advance', requireKey, async (req, res) => {
    try {
      res.json(await dealSide.advanceBuyerStage({
        tenantId: tenantId(req),
        userId: userId(req),
        clientRef: req.params.ref,
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/deals/sellers/:ref/advance', requireKey, async (req, res) => {
    try {
      res.json(await dealSide.advanceSellerStage({
        tenantId: tenantId(req),
        userId: userId(req),
        listingRef: req.params.ref,
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/client-comms/log', requireKey, async (req, res) => {
    res.json(await clientComms.listCommsLog({
      tenantId: tenantId(req),
      userId: userId(req),
      limit: Number(req.query.limit) || 25,
    }));
  });

  router.get('/recruiting/pipeline', requireKey, async (req, res) => {
    res.json(await recruiting.listPipeline({ tenantId: tenantId(req), userId: userId(req) }));
  });

  router.post('/recruiting/pipeline', requireKey, async (req, res) => {
    res.json(await recruiting.upsertCandidate({
      tenantId: tenantId(req),
      userId: userId(req),
      candidateName: req.body?.candidate_name,
      stage: req.body?.stage || 'prospect',
      notes: req.body?.notes,
    }));
  });

  router.get('/finance/forecast', requireKey, async (req, res) => {
    res.json(await finance.getForecast({ tenantId: tenantId(req), userId: userId(req) }));
  });

  router.get('/opportunity/signals', requireKey, async (req, res) => {
    res.json(await opportunity.rankOpportunities({ tenantId: tenantId(req), userId: userId(req) }));
  });

  router.post('/opportunity/scan', requireKey, async (req, res) => {
    try {
      res.json(await alphaSurface.scanOpportunities({
        tenantId: tenantId(req),
        userId: userId(req),
      }));
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/receptionist/summary', requireKey, async (req, res) => {
    res.json(await receptionist.inboundSummary({
      callId: req.body?.call_id,
      leadPayload: req.body?.lead,
      userId: userId(req),
      tenantId: tenantId(req),
    }));
  });

  router.get('/receptionist/calls', requireKey, async (req, res) => {
    res.json(await receptionist.listRecentCalls({ userId: userId(req) }));
  });

  router.post('/receptionist/calls/:callId/follow-up-draft', requireKey, async (req, res) => {
    try {
      const { calls } = await receptionist.listRecentCalls({ userId: userId(req), limit: 50 });
      const call = (calls || []).find((c) => c.call_id === req.params.callId);
      if (!call) {
        res.status(404).json({ ok: false, error: 'call_not_found' });
        return;
      }
      const draft = req.body?.message
        || `Hi — thanks for calling. Following up on your ${call.intent || 'inquiry'}. When is a good time to connect?`;
      const queued = await clientComms.queueDraft({
        tenantId: tenantId(req),
        userId: userId(req),
        actionType: 'sms_lead',
        draft,
        payload: {
          source: 'receptionist_call',
          call_id: call.call_id,
          recipient_phone: call.caller_number,
          recipient_name: call.summary?.replace(/^Inbound:\s*/, '').split('—')[0]?.trim(),
          channel: 'sms',
        },
      });
      res.json({ ok: true, call_id: call.call_id, queued });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/receptionist/vapi-end', async (req, res) => {
    const vapiSecret = process.env.VAPI_WEBHOOK_SECRET || process.env.VAPI_SECRET;
    if (vapiSecret) {
      const provided = req.headers['x-vapi-secret'] || req.headers['x-webhook-secret'] || req.body?.secret;
      if (provided !== vapiSecret) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }
    }
    const callData = req.body?.call || req.body?.message?.call || req.body;
    res.json(await receptionist.ingestVapiCallEnded({
      callData,
      userId: req.body?.user_id || 'adam',
      tenantId: req.body?.tenant_id || 'default',
    }));
  });

  router.post('/outreach/enqueue', requireKey, async (req, res) => {
    res.json(await outreach.enqueueSequence({
      userId: userId(req),
      sequenceId: req.body?.sequence_id,
      recipientRef: req.body?.recipient_ref,
      draft: req.body?.draft,
      channel: req.body?.channel,
      recipientEmail: req.body?.recipient_email,
      recipientPhone: req.body?.recipient_phone,
      recipientName: req.body?.recipient_name,
      approved: Boolean(req.body?.approved),
    }));
  });

  router.get('/outreach/queue', requireKey, async (req, res) => {
    res.json(await outreach.listPendingTasks({ userId: userId(req) }));
  });

  router.post('/outreach/approve/:taskId', requireKey, async (req, res) => {
    res.json(await outreach.approveTask({ taskId: req.params.taskId, userId: userId(req) }));
  });

  router.post('/outreach/execute/:taskId', requireKey, async (req, res) => {
    res.json(await outreach.executeTaskById({ taskId: req.params.taskId, userId: userId(req) }));
  });

  router.post('/outreach/process-queue', requireKey, async (req, res) => {
    res.json(await outreach.processQueue({ userId: userId(req) }));
  });

  router.post('/follow-up/draft', requireKey, async (req, res) => {
    res.json(await followUpOS.draftFollowUp({
      userId: userId(req),
      contactId: req.body?.contact_id,
      message: req.body?.message,
      contactMeta: {
        tenant_id: tenantId(req),
        lead: req.body?.lead || req.body?.recipient_name,
        recipient_phone: req.body?.recipient_phone,
        recipient_email: req.body?.recipient_email,
        channel: req.body?.channel,
        source: req.body?.source || 'follow_up_draft',
      },
    }));
  });

  router.post('/scenario/compare', requireKey, async (req, res) => {
    res.json(await scenario.compareScenarios({
      tenantId: tenantId(req),
      userId: userId(req),
      horizonDays: Number(req.body?.horizon_days) || 90,
      paths: req.body?.paths || [],
      goalWeights: req.body?.goal_weights,
    }));
  });

  router.get('/scenario/future', requireKey, async (req, res) => {
    res.json({ ok: true, future: await scenario.projectFuturePath({ userId: userId(req) }) });
  });

  router.post('/experiments/start', requireKey, async (req, res) => {
    res.json(await experiment.startExperiment({
      tenantId: tenantId(req),
      userId: userId(req),
      variantA: req.body?.variant_a,
      variantB: req.body?.variant_b,
      metric: req.body?.metric || 'conversion',
    }));
  });

  router.post('/experiments/:id/result', requireKey, async (req, res) => {
    res.json(await experiment.recordResult({
      tenantId: tenantId(req),
      userId: userId(req),
      experimentId: req.params.id,
      result: req.body?.result || req.body,
    }));
  });

  router.get('/relationships', requireKey, async (req, res) => {
    const edges = await relationship.listEdgesForUser({ tenantId: tenantId(req), userId: userId(req) });
    res.json({ ok: true, edges });
  });

  router.put('/relationships/:edgeId', requireKey, async (req, res) => {
    res.json(await relationship.writeEdge({
      tenantId: tenantId(req),
      edgeId: req.params.edgeId,
      payload: req.body?.payload || req.body,
    }));
  });

  router.get('/learning/status', requireKey, async (_req, res) => {
    res.json(await learning.status());
  });

  router.post('/learning/run-cycle', requireKey, async (req, res) => {
    res.json(await learning.runLearningCycle({
      tenantId: tenantId(req),
      userId: userId(req),
      variantA: req.body?.variant_a,
      variantB: req.body?.variant_b,
      metric: req.body?.metric || 'conversion',
      winner: req.body?.winner,
      weightDelta: req.body?.weight_delta || {},
    }));
  });

  router.get('/founder/adam', requireKey, (req, res) => {
    try {
      assertFounderAccess({ userId: userId(req), target: 'adam' });
      res.json({ ok: true, twin: founder.readFounderTwin('adam') });
    } catch (error) {
      res.status(error.status || 403).json({ ok: false, error: error.message });
    }
  });

  router.get('/founder/sherry', requireKey, (req, res) => {
    try {
      assertFounderAccess({ userId: userId(req), target: 'sherry' });
      res.json({ ok: true, twin: founder.readFounderTwin('sherry') });
    } catch (error) {
      res.status(error.status || 403).json({ ok: false, error: error.message });
    }
  });

  router.post('/council/deliberate', requireKey, async (req, res) => {
    const result = await council.runCouncilDeliberation({
      intent: req.body?.intent || 'default',
      message: req.body?.message,
      userId: userId(req),
    });
    res.json({ ok: true, ...result, model: pickModel({ taskComplexity: req.body?.complexity || 'low' }) });
  });

  router.post('/community/content-plan', requireKey, (req, res) => {
    res.json(alphaSurface.communityContentPlan({
      groupName: req.body?.group_name,
      weeks: Number(req.body?.weeks) || 2,
    }));
  });

  router.post('/community/post-draft', requireKey, (req, res) => {
    res.json(alphaSurface.communityPostDraft({
      groupName: req.body?.group_name,
      theme: req.body?.theme || req.body?.topic,
    }));
  });

  router.post('/community/moderation', requireKey, (req, res) => {
    res.json(alphaSurface.communityModeration({
      flaggedComments: req.body?.flagged_comments || [],
    }));
  });

  return router;
}
