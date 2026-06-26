/**
 * SYNOPSIS: Founder work executors — deliverables (video packages, etc.), not counsel theater.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { createLifeREMarketingModule } from './lifere-marketing-module.js';

function formatVideoPackageHumanSummary(videos = [], count = 0) {
  const lines = [
    `Done — ${videos.length}-video package ready.`,
    '',
  ];
  videos.forEach((v, i) => {
    lines.push(`**Video ${i + 1}: ${v.label}**`);
    lines.push(`Hook: ${v.hook_text}`);
    if (v.title_variants?.[0]) lines.push(`Title: ${v.title_variants[0]}`);
    if (v.script_outline?.length) {
      lines.push('Outline:');
      v.script_outline.forEach((s) => lines.push(`  • ${s}`));
    }
    if (v.b_roll_beats?.length) lines.push(`B-roll: ${v.b_roll_beats.join(' · ')}`);
    lines.push('');
  });
  lines.push('Say which video to expand into a full script, or "schedule these" for calendar.');
  return lines.join('\n').trim();
}

async function executeVideoPackage({ params = {}, pool, userId, tenantId = 'default' }) {
  const count = Math.min(Math.max(Number(params.count) || 5, 1), 10);
  const marketing = createLifeREMarketingModule({ pool });
  const types = marketing.getVideoTypes()?.types || [];
  if (!types.length) {
    return {
      ok: false,
      pass_fail: 'FAIL',
      command_truth: 'NO_COMMAND_RAN',
      action_type: 'video_package',
      error: 'no_video_types_configured',
      human_summary: 'Video types config is missing — cannot build package.',
    };
  }

  const selected = types.slice(0, count);
  const videos = [];
  for (const vt of selected) {
    const script = await marketing.generateScript({
      tenantId,
      userId,
      videoTypeId: vt.id,
      hookText: vt.hook_angle,
    });
    videos.push({
      video_type_id: vt.id,
      label: vt.label,
      duration_target_sec: vt.duration_target_sec,
      hook_text: script.hook_text,
      title_variants: script.title_variants,
      script_outline: script.script_outline,
      b_roll_beats: script.b_roll_beats,
      retention_pattern_notes: script.retention_pattern_notes,
      thumbnail_notes: script.thumbnail_notes,
    });
  }

  let hooks = null;
  try {
    hooks = await marketing.researchHooks({ tenantId, userId, count: Math.min(count, 5) });
  } catch {
    hooks = null;
  }

  return {
    ok: true,
    pass_fail: 'PASS',
    command_truth: 'COMMAND_RAN',
    action_type: 'video_package',
    human_summary: formatVideoPackageHumanSummary(videos, count),
    receipt: {
      executor: 'video_package',
      count: videos.length,
      video_type_ids: videos.map((v) => v.video_type_id),
      hooks_researched: hooks?.hooks?.length || 0,
      persisted_hooks: Boolean(pool && hooks?.hooks?.length),
    },
    package: { videos, hooks: hooks?.hooks || [] },
  };
}

const EXECUTORS = {
  video_package: executeVideoPackage,
};

/**
 * Run a compiled work intent — returns chair-ready result or null if unsupported.
 */
export async function executeFounderWorkIntent(compiled, deps = {}) {
  if (!compiled || compiled.intent !== 'work' || !compiled.execute_now || !compiled.executor) {
    return null;
  }
  const fn = EXECUTORS[compiled.executor];
  if (typeof fn !== 'function') {
    return {
      ok: false,
      pass_fail: 'FAIL',
      command_truth: 'NO_COMMAND_RAN',
      action_type: compiled.executor,
      error: 'executor_not_implemented',
      human_summary: `I understood "${compiled.paraphrase || compiled.executor}" but that executor is not wired yet.`,
    };
  }
  const result = await fn({
    params: compiled.params || {},
    pool: deps.pool,
    userId: deps.userId || 'adam',
    tenantId: deps.tenantId || 'default',
  });
  return { ...result, intent_compiler: compiled };
}
