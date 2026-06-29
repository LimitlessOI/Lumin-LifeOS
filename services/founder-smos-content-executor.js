/**
 * SYNOPSIS: Social Media OS content executor — brief → coach → pack (not generic video templates).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { createLifeRESocialMediaOSBridge } from './lifere-socialmediaos-bridge.js';

function extractContentTopic(utterance = '') {
  const t = String(utterance || '').trim();
  const m = t.match(/\b(?:about|on|for)\s+(.{8,120})/i);
  if (m) return m[1].replace(/\.$/, '').trim();
  if (t.length > 12 && t.length < 200) return t.slice(0, 160);
  return 'Social content package';
}

function formatSmoSummary({
  brief,
  pipeline,
  videos = [],
  utterance,
  autoApproved = false,
}) {
  const lines = [];
  if (brief?.topic) {
    lines.push(`Content brief: **${brief.topic}**${autoApproved ? ' (approved for this run)' : ''}.`);
  }
  if (pipeline?.coach?.response) {
    lines.push('');
    lines.push(String(pipeline.coach.response).slice(0, 1200));
  }
  if (videos.length) {
    lines.push('');
    lines.push(`**${videos.length} video scripts** (from your SMOS brief + hooks — not random templates):`);
    videos.forEach((v, i) => {
      lines.push('');
      lines.push(`**${i + 1}. ${v.label || v.video_type_id}**`);
      if (v.hook_text) lines.push(`Hook: ${v.hook_text}`);
      if (v.script_outline?.length) {
        v.script_outline.forEach((s) => lines.push(`• ${s}`));
      }
    });
  }
  if (pipeline?.content_pack?.hooks?.length) {
    lines.push('');
    lines.push('Research hooks saved to pack.');
  }
  lines.push('');
  lines.push('Next: record one, or say which script to expand — I\'ll queue for approval per SMOS.');
  return lines.join('\n').trim();
}

export async function executeSocialMediaContentPackage({
  utterance = '',
  params = {},
  pool = null,
  userId = 'adam',
  userHandle = 'adam',
  tenantId = 'default',
  callCouncilMember = null,
  autoApproveFounder = true,
} = {}) {
  const uid = userHandle || userId || 'adam';
  const bridge = createLifeRESocialMediaOSBridge({ pool, callCouncilMember });
  const count = Math.min(Math.max(Number(params.count) || 5, 1), 10);
  const topic = extractContentTopic(utterance);

  let brief = await bridge.briefEngine.getActiveApprovedBrief({ tenantId, userId: uid });
  let autoApproved = false;

  if (!brief) {
    const draft = await bridge.briefEngine.generateBrief({
      tenantId,
      userId: uid,
      topic,
      market: 'Las Vegas',
    });
    if (!draft.ok) {
      return {
        ok: false,
        pass_fail: 'FAIL',
        command_truth: 'NO_COMMAND_RAN',
        action_type: 'socialmediaos_content',
        human_summary: 'Could not start SMOS content brief — say what market/topic the videos are for.',
        error: draft.error,
      };
    }
    if (autoApproveFounder) {
      const approved = await bridge.briefEngine.approveBrief({
        tenantId,
        userId: uid,
        briefId: draft.brief_id,
        approvedBy: uid,
      });
      brief = approved.brief || draft.brief;
      autoApproved = true;
    } else {
      return {
        ok: true,
        pass_fail: 'PASS',
        command_truth: 'COMMAND_RAN',
        action_type: 'socialmediaos_content',
        human_summary: [
          `I drafted a content brief on **${topic}** — SMOS requires brief approval before scripts.`,
          `Open LifeRE → Social Media OS → approve brief \`${draft.brief_id}\`, then ask again.`,
          'I will not dump generic template videos; scripts come from your brief, hooks, and twin.',
        ].join('\n'),
        receipt: { executor: 'socialmediaos_content', brief_id: draft.brief_id, status: 'draft' },
      };
    }
  }

  const pipeline = await bridge.runPipeline({
    userId: uid,
    tenantId,
    coachMessage: utterance,
    briefId: brief.id || brief.brief_id,
    bypassBriefGate: true,
    videoTypeId: 'market_update_60',
  });

  const types = bridge.marketing.getVideoTypes()?.types || [];
  const briefBody = brief.brief_body || brief;
  const hookTexts = [
    ...(briefBody.hooks || []).map((h) => h.hook_text).filter(Boolean),
    ...(pipeline.content_pack?.hooks || []).map((h) => h.hook_text).filter(Boolean),
  ];
  const selectedTypes = types.slice(0, count);
  const videos = [];

  for (let i = 0; i < selectedTypes.length; i += 1) {
    const vt = selectedTypes[i];
    const script = await bridge.marketing.generateScript({
      tenantId,
      userId: uid,
      videoTypeId: vt.id,
      hookText: hookTexts[i] || vt.hook_angle,
    });
    videos.push({
      video_type_id: vt.id,
      label: vt.label,
      hook_text: script.hook_text,
      script_outline: script.script_outline,
      b_roll_beats: script.b_roll_beats,
      title_variants: script.title_variants,
    });
  }

  return {
    ok: pipeline.ok !== false,
    pass_fail: 'PASS',
    command_truth: 'COMMAND_RAN',
    action_type: 'socialmediaos_content',
    human_summary: formatSmoSummary({
      brief: briefBody,
      pipeline,
      videos,
      utterance,
      autoApproved,
    }),
    receipt: {
      executor: 'socialmediaos_content',
      authority: 'docs/products/marketingos/socialmediaos/PRODUCT_HOME.md',
      brief_id: brief.id || brief.brief_id,
      auto_approved: autoApproved,
      video_count: videos.length,
      pipeline_steps: pipeline.steps || [],
    },
    package: { videos, pipeline, brief: briefBody },
  };
}
