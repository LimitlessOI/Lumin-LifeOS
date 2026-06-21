/**
 * SYNOPSIS: Prevention rule registry — CANDIDATE_RULE only from receipt-backed lessons.
 * Prevention rule registry — CANDIDATE_RULE only from receipt-backed lessons.
 * No invariant promotion. No invented rules.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 * @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyRepairLesson,
  getVerificationPathForClassification,
} from './self-repair-lesson-classifier.js';
import { readRepairMemoryLogTail, readLatestRepairMemory } from './self-repair-memory.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PREVENTION_REGISTRY_PATH = path.join(ROOT, 'data', 'self-repair-prevention-registry.json');

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function receiptIds(lesson) {
  return (lesson.receipts_written || []).map(String).filter(Boolean);
}

function confidenceFromEvidence(lessonCount, receiptCount) {
  if (lessonCount < 1 || receiptCount < 1) return 0;
  const raw = 0.45 + lessonCount * 0.12 + Math.min(receiptCount, 6) * 0.04;
  return Math.min(0.9, Math.round(raw * 100) / 100);
}

/**
 * Build candidate rules from real lessons — skips UNKNOWN and receipt-less lessons.
 */
export function buildCandidateRulesFromLessons(lessons = []) {
  const groups = new Map();

  for (const lesson of lessons) {
    const { classification } = classifyRepairLesson(lesson);
    if (classification === 'UNKNOWN') continue;

    const prevention = lesson.prevention_rule;
    if (!prevention || typeof prevention !== 'string' || !prevention.trim()) continue;

    const ids = receiptIds(lesson);
    if (!ids.length) continue;

    const key = `${classification}::${normalizeKey(prevention)}`;
    const existing = groups.get(key) || {
      classification,
      trigger: lesson.trigger || null,
      prevention_action: prevention.trim(),
      verification_path: getVerificationPathForClassification(classification),
      source_receipt_ids: [],
      source_lesson_ts: [],
      lesson_count: 0,
      status: 'CANDIDATE_RULE',
    };

    existing.lesson_count += 1;
    existing.source_lesson_ts.push(lesson.ts || null);
    for (const id of ids) {
      if (!existing.source_receipt_ids.includes(id)) {
        existing.source_receipt_ids.push(id);
      }
    }
    if (!existing.trigger && lesson.trigger) {
      existing.trigger = lesson.trigger;
    }
    groups.set(key, existing);
  }

  const rules = [...groups.values()]
    .map((row, index) => ({
      id: `CAND-${String(index + 1).padStart(3, '0')}`,
      status: 'CANDIDATE_RULE',
      classification: row.classification,
      trigger: row.trigger,
      prevention_action: row.prevention_action,
      verification_path: row.verification_path,
      confidence: confidenceFromEvidence(row.lesson_count, row.source_receipt_ids.length),
      source_receipt_ids: row.source_receipt_ids,
      lesson_count: row.lesson_count,
      source_lesson_ts: row.source_lesson_ts.filter(Boolean),
      promoted_to_invariant: false,
    }))
    .sort((a, b) => b.confidence - a.confidence || b.lesson_count - a.lesson_count);

  return rules;
}

function ensureDataDir() {
  const dir = path.dirname(PREVENTION_REGISTRY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Persist registry snapshot (best-effort). */
export function writePreventionRegistrySnapshot(rules = []) {
  try {
    ensureDataDir();
    const payload = {
      generated_at: new Date().toISOString(),
      status: rules.length ? 'CANDIDATE_RULES' : 'NO_DATA',
      promoted_to_invariant: false,
      rules,
    };
    fs.writeFileSync(PREVENTION_REGISTRY_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    return { written: true, path: PREVENTION_REGISTRY_PATH, count: rules.length };
  } catch {
    return { written: false, path: PREVENTION_REGISTRY_PATH, count: rules.length };
  }
}

export function readPreventionRegistrySnapshot() {
  if (!fs.existsSync(PREVENTION_REGISTRY_PATH)) {
    return { ok: false, status: 'NOT_WIRED', rules: [], generated_at: null };
  }
  try {
    const data = JSON.parse(fs.readFileSync(PREVENTION_REGISTRY_PATH, 'utf8'));
    return {
      ok: true,
      status: data.status || 'CANDIDATE_RULES',
      rules: data.rules || [],
      generated_at: data.generated_at || null,
      registry_path: 'data/self-repair-prevention-registry.json',
    };
  } catch {
    return { ok: false, status: 'NOT_WIRED', rules: [], generated_at: null };
  }
}

/** Load lessons (JSONL + DB fallback), build candidates, optionally persist snapshot. */
export async function buildPreventionRegistry(pool, { lessonLimit = 50, persist = true } = {}) {
  const fromLog = readRepairMemoryLogTail(lessonLimit);
  let lessons = fromLog;
  if (!lessons.length && pool) {
    const memory = await readLatestRepairMemory(pool, lessonLimit);
    lessons = memory.lessons || [];
  }
  const rules = buildCandidateRulesFromLessons(lessons);
  const snapshot = persist ? writePreventionRegistrySnapshot(rules) : { written: false };

  return {
    ok: rules.length > 0,
    status: rules.length ? 'CANDIDATE_RULES' : 'NO_DATA',
    candidate_rules: rules,
    lesson_count_scanned: lessons.length,
    lesson_source: fromLog.length ? 'jsonl' : lessons.length ? 'epistemic_facts' : 'none',
    registry: snapshot.written
      ? { path: 'data/self-repair-prevention-registry.json', count: rules.length }
      : { path: null, count: rules.length, note: 'ephemeral — snapshot not persisted on this host' },
    generated_at: new Date().toISOString(),
  };
}
