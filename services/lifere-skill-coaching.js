/**
 * SYNOPSIS: LifeRE skill coaching — 24 modules, drills, performance link.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLifeRETwinStore } from './lifere-twin-store.js';
import { skillDeltaImpact } from './lifere-performance-twin.js';

function learningStyleInstruction(learningProfile) {
  if (!learningProfile) return '';
  const style = String(learningProfile.learning_style || learningProfile.style || learningProfile || '').toLowerCase();
  if (style.includes('visual')) {
    return 'LEARNING STYLE: This learner is visual. Use concrete imagery, compare to something they can picture, and structure the drill like a scene or diagram.';
  }
  if (style.includes('aud') || style.includes('hear') || style.includes('listen') || style.includes('sound')) {
    return 'LEARNING STYLE: This learner is auditory. Keep language rhythmic and spoken, emphasize tone and pacing, and make the drill feel like a live conversation.';
  }
  if (style.includes('read') || style.includes('write') || style.includes('text')) {
    return 'LEARNING STYLE: This learner prefers reading/writing. Give a concise written takeaway, bullet points, and a short script they can save and study.';
  }
  if (style.includes('kine') || style.includes('do') || style.includes('pract') || style.includes('hands')) {
    return 'LEARNING STYLE: This learner is kinesthetic. End the drill with one physical action or role-play step they can practice out loud immediately.';
  }
  return `LEARNING STYLE: ${JSON.stringify(learningProfile)}`;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES_PATH = path.join(ROOT, 'config/lifere-coaching-modules.json');

export function loadCoachingModules() {
  return JSON.parse(fs.readFileSync(MODULES_PATH, 'utf8'));
}

export function createLifeRESkillCoaching({ pool = null } = {}) {
  const twinStore = createLifeRETwinStore({ pool });

  function listModules() {
    return loadCoachingModules();
  }

  async function startDrill({ tenantId = 'default', userId, moduleId, learningProfile = null }) {
    const mods = loadCoachingModules();
    const mod = mods.modules.find((m) => m.id === moduleId);
    if (!mod) throw new Error(`Unknown module: ${moduleId}`);
    const styleBlock = learningStyleInstruction(learningProfile);
    return {
      ok: true,
      module_id: moduleId,
      label: mod.label,
      drill_minutes: mod.drill_minutes_default,
      learning_profile: learningProfile,
      prompt: `Practice ${mod.label}: role-play objection or pitch for ${mod.drill_minutes_default} minutes.${styleBlock ? `\n\n${styleBlock}` : ''}`,
    };
  }

  async function completeDrill({ tenantId = 'default', userId, moduleId, score, durationMinutes, debrief = '', learningProfile = null }) {
    if (pool) {
      await pool.query(
        `INSERT INTO lifere_skill_drill_log (tenant_id, user_id, module_id, score, duration_minutes, debrief)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [tenantId, userId, moduleId, score, durationMinutes, debrief]
      );
    }

    const skill = twinStore.readTwin({ tenantId, userId, twinKey: 'skill' }) || {
      schema: 'lifere_skill_twin_v1',
      modules: {},
      scores: {},
      practice_hours: {},
    };
    skill.scores[moduleId] = score;
    skill.practice_hours[moduleId] = (skill.practice_hours[moduleId] || 0) + durationMinutes / 60;
    skill.last_drill = { module_id: moduleId, at: new Date().toISOString() };
    if (learningProfile) {
      skill.learning_profile = learningProfile;
    }
    await twinStore.writeTwin({ tenantId, userId, twinKey: 'skill', payload: skill });

    return { ok: true, skill, debrief_adaptation: learningStyleInstruction(learningProfile) };
  }

  function skillImpact({ baselineRate = 0.08, improvedRate = 0.12, goalGci = 30000 }) {
    return skillDeltaImpact({ baselineRate, improvedRate, goalGci });
  }

  return { listModules, startDrill, completeDrill, skillImpact };
}