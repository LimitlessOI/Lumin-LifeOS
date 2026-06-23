/**
 * SYNOPSIS: LifeRE SocialMediaOS bridge — Am 41 coach/content-pack via LifeRE approval gate.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import { createLifeREMarketingModule } from './lifere-marketing-module.js';
import { createLifeREClientComms } from './lifere-client-comms.js';
import { createLifeREOutreachBridge } from './lifere-outreach-bridge.js';

export function createLifeRESocialMediaOSBridge({
  pool = null,
  notificationService = null,
  sendSMS = null,
  callCouncilMember = null,
  logger = console,
} = {}) {
  const outreach = createLifeREOutreachBridge({ pool, notificationService, sendSMS, logger });
  const comms = createLifeREClientComms({ pool, outreach, logger });
  const marketing = createLifeREMarketingModule({ pool });

  async function status() {
    return {
      ok: true,
      stack: 'lifere_socialmediaos_v1',
      authority: 'docs/projects/AMENDMENT_41_MARKETINGOS.md',
      adapter: 'lifere-socialmediaos-bridge',
      modules: {
        coach: callCouncilMember ? 'callCouncilMember' : 'template_fallback',
        content_engine: 'marketing-content-engine.js',
        lifere_marketing: 'lifere-marketing-module.js',
      },
      publish_mode: 'approval_queue_only',
      data_wall: 'Am41 must not import LifeRE PG tables — adapter boundary only',
      label: 'KNOW',
    };
  }

  async function coachSession({ userId = 'adam', message, history = [] }) {
    if (!message?.trim()) {
      return { ok: false, error: 'message required' };
    }
    try {
      if (callCouncilMember) {
        const reply = await callCouncilMember({
          member: 'marketing',
          message: `Marketing coach for real estate agent. User says: ${message}`,
          userId,
        });
        const text = reply?.content || reply?.response || reply?.text || String(reply || '');
        return {
          ok: true,
          response: text.slice(0, 2000) || 'Coach response empty.',
          hookDetected: /next step|action|call to action/i.test(text),
          label: 'KNOW',
        };
      }
      return {
        ok: true,
        response: `This week: turn "${message.slice(0, 80)}" into one 60-second market update video + 3 comment replies.`,
        hookDetected: true,
        label: 'THINK',
      };
    } catch (err) {
      logger.warn?.('[LIFERE-SMO] coach skip:', err.message);
      return {
        ok: true,
        response: 'Coach session unavailable — use transcript → content pack or hook research.',
        hookDetected: false,
        label: 'THINK',
      };
    }
  }

  async function transcriptToContentPack({ transcript = '', userId = 'adam', tenantId = 'default', niche = 'real_estate' }) {
    const { extractMarketingContent } = await import('./marketing-content-engine.js');
    const snippets = extractMarketingContent(transcript);
    const hooks = await marketing.researchHooks({ tenantId, userId, niche, count: 5 });
    return {
      ok: true,
      schema: 'socialmediaos_content_pack_v1',
      snippets,
      hooks: hooks.hooks || [],
      suggested_posts: snippets.slice(0, 5).map((text, i) => ({
        id: `post_${i + 1}`,
        channel: 'facebook',
        body: text,
        requires_approval: true,
      })),
      label: snippets.length ? 'KNOW' : 'THINK',
    };
  }

  async function queueContentPost({
    userId = 'adam',
    tenantId = 'default',
    body,
    channel = 'facebook',
    platform = channel,
  } = {}) {
    const queued = await comms.queueDraft({
      tenantId,
      userId,
      actionType: 'social_post',
      draft: body,
      payload: { channel, platform, source: 'socialmediaos', template_id: 'social_post' },
    });
    return { ok: true, queue: queued, requires_approval: true, label: queued.persisted ? 'KNOW' : 'THINK' };
  }

  async function suggestSocialReply({ userId = 'adam', tenantId = 'default', platform = 'facebook', context = '', mode = 'comment' } = {}) {
    const draft = mode === 'dm'
      ? `Hey — saw your message on ${platform}. ${context?.slice(0, 80) || 'Happy to help.'}`
      : `Thanks for jumping in on ${platform}! ${context?.slice(0, 80) || 'Great question.'} DM me for details.`;
    const queued = await comms.queueDraft({
      tenantId,
      userId,
      actionType: mode === 'dm' ? 'dm_reply' : 'comment_reply',
      draft,
      payload: { platform, context, channel: 'sms', source: 'socialmediaos' },
    });
    return { ok: true, suggestion: draft, queue: queued, requires_approval: true };
  }

  async function runPipeline({
    userId = 'adam',
    tenantId = 'default',
    coachMessage = null,
    transcript = null,
    videoTypeId = 'market_update_60',
  } = {}) {
    const steps = [];
    let coach = null;
    let pack = null;
    let script = null;

    if (coachMessage) {
      coach = await coachSession({ userId, message: coachMessage });
      steps.push({ step: 'coach', ok: coach.ok === true });
    }
    if (transcript) {
      pack = await transcriptToContentPack({ transcript, userId, tenantId });
      steps.push({ step: 'content_pack', ok: Boolean(pack.snippets?.length || pack.hooks?.length) });
    }
    if (videoTypeId) {
      script = await marketing.generateScript({
        tenantId,
        userId,
        videoTypeId,
        hookText: pack?.hooks?.[0]?.hook_text || coach?.response?.slice(0, 80),
      });
      steps.push({ step: 'script', ok: script.ok === true });
    }

    return {
      ok: steps.every((s) => s.ok) || steps.length === 0,
      steps,
      coach,
      content_pack: pack,
      script,
      label: steps.every((s) => s.ok) ? 'KNOW' : 'THINK',
    };
  }

  return {
    status,
    coachSession,
    transcriptToContentPack,
    queueContentPost,
    suggestSocialReply,
    runPipeline,
    marketing,
  };
}
