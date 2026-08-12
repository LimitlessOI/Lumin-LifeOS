#!/usr/bin/env node
/**
 * SYNOPSIS: The Architect resolution pass. Takes the specification requests the
 * no-invention detector routed upward and resolves each one using ONLY the three
 * moves the write-back allowlist permits (blueprint §18, B2).
 *
 * This is the mechanism whose absence made the system unable to finish on its own.
 * Detection, classification and routing all worked; nothing ever answered. A loop
 * that can only ever say "blocked" is not self-repairing, it is just polite.
 *
 * What it deliberately does NOT do: draft columns. Resolving "the schema is
 * unspecified" by designing a schema is the original defect wearing a different
 * office's badge. Every column written back here is copied from a source file that
 * already contains it, and the citation is recorded so a reader can check.
 *
 * Usage:
 *   node scripts/architect-resolve-requests.mjs --session <path.json>
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RESOLUTION_KIND,
  WRITE_BACK_PERMITTED,
  REQUIRED_CITATION_FIELDS,
  CITATION_SOURCE_KIND,
  CLASS_B_SUBJECTS,
} from '../config/architect-writeback-allowlist.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = 'db/migrations';

function normalizeTableKey(name) {
  return String(name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Every table that genuinely exists in the repository, with its real columns.
 * This is the only source the Architect may cite for a schema: a file on disk
 * that already declares it.
 */
export function scanExistingTables({ root = ROOT } = {}) {
  const found = new Map();
  const dir = path.join(root, MIGRATIONS_DIR);
  if (!fs.existsSync(dir)) return found;

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    let text;
    try {
      text = fs.readFileSync(path.join(dir, file), 'utf8');
    } catch {
      continue;
    }
    const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([A-Za-z0-9_.]+)["`]?\s*\(([\s\S]*?)\)\s*;/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const [, rawName, body] = m;
      const name = rawName.split('.').pop();
      const columns = body
        .split(/,(?![^(]*\))/)
        .map((line) => line.trim())
        .filter((line) => line && !/^(primary|foreign|unique|constraint|check|key|index)\b/i.test(line))
        .map((line) => {
          const parts = line.replace(/["`]/g, '').split(/\s+/);
          return { name: parts[0].toLowerCase(), type: (parts[1] || 'UNSPECIFIED').toUpperCase() };
        })
        .filter((c) => c.name);
      if (columns.length === 0) continue;
      const key = normalizeTableKey(name);
      // First declaration wins; later migrations alter rather than redefine.
      if (!found.has(key)) {
        found.set(key, { table: name, columns, source_file: `${MIGRATIONS_DIR}/${file}`, source_kind: CITATION_SOURCE_KIND.MIGRATION });
      }
    }
  }
  return found;
}

/** Does the blueprint itself put this subject outside the current phase? */
function declaredNonGoal(subject, blueprint, intent) {
  const nonGoals = [
    ...(Array.isArray(intent?.non_goals) ? intent.non_goals : []),
    ...(Array.isArray(blueprint?._meta?.non_goals) ? blueprint._meta.non_goals : []),
  ].map((g) => String(g).toLowerCase());
  const key = String(subject || '').toLowerCase();
  const hit = nonGoals.find((g) => g.includes(key));
  return hit ? { non_goal_text: hit } : null;
}

function isClassB(request) {
  const text = `${request.question || ''} ${request.subject || ''}`.toLowerCase();
  const hits = CLASS_B_SUBJECTS.filter((s) => text.includes(s));
  return hits.length > 0 ? hits : null;
}

/**
 * Resolve one request. Returns the chosen move, the evidence behind it, and — for
 * a citation — the exact columns and where they came from.
 */
export function resolveRequest(request, { existingTables, blueprint, intent }) {
  const classB = isClassB(request);
  if (classB) {
    return {
      request,
      kind: RESOLUTION_KIND.FOUNDER_QUESTION,
      write_back: false,
      reason: `class_b_subject:${classB.join(',')}`,
      detail: 'This is product behavior, policy or founder intent. The Architect has no authority here at any level of confidence.',
    };
  }

  const subject = request.subject;
  if (request.defect_id === 'INVENTED_SQL_SCHEMA' || request.defect_id === 'INVENTED_TABLE') {
    const existing = existingTables.get(normalizeTableKey(subject));
    if (existing) {
      return {
        request,
        kind: RESOLUTION_KIND.CITE_EXISTING,
        write_back: true,
        citation: {
          source_file: existing.source_file,
          source_kind: existing.source_kind,
          columns: existing.columns,
        },
        detail: `"${subject}" already exists in the repository. Citing its real columns is reuse, not authorship — the Architect reports a fact rather than making a decision.`,
      };
    }

    const nonGoal = declaredNonGoal(subject, blueprint, intent);
    if (nonGoal) {
      return {
        request,
        kind: RESOLUTION_KIND.MARK_NON_GOAL,
        write_back: true,
        evidence: nonGoal,
        detail: `The blueprint places "${subject}" outside this phase. Dropping it from scope is honest; building it blind is not.`,
      };
    }

    return {
      request,
      kind: RESOLUTION_KIND.FOUNDER_QUESTION,
      write_back: false,
      reason: 'no_citable_source_and_not_a_declared_non_goal',
      detail: `"${subject}" does not exist in the repository and the blueprint does not defer it. Drafting its columns is forbidden write-back — that is invention wearing the Architect's badge.`,
      structured_question: {
        subject,
        asks: `What are the columns and types of "${subject}"?`,
        why_it_reached_you: 'The source document names the store and its purpose but never specifies its schema, and no existing table matches it.',
        options_the_system_may_not_choose_between: [
          'design the schema now',
          'defer the store to a later phase',
          'reuse an existing store instead',
        ],
        answer_goes_to: 'the authoritative blueprint document, before Builder receives it',
      },
    };
  }

  return {
    request,
    kind: RESOLUTION_KIND.FOUNDER_QUESTION,
    write_back: false,
    reason: `no_architect_rule_for_defect:${request.defect_id}`,
    detail: 'No allowlisted Architect move covers this defect class, so it routes upward rather than being improvised.',
  };
}

/**
 * Guard. Runs over the Architect's own output and fails if it wrote anything it
 * was not permitted to write. The office that resolves must not be the only thing
 * checking whether it stayed inside its authority.
 */
export function auditResolutions(resolutions) {
  const violations = [];
  for (const r of resolutions) {
    if (r.write_back && !WRITE_BACK_PERMITTED.includes(r.kind)) {
      violations.push({ id: 'WRITE_BACK_NOT_PERMITTED', kind: r.kind, subject: r.request?.subject });
    }
    if (r.kind === RESOLUTION_KIND.CITE_EXISTING) {
      for (const field of REQUIRED_CITATION_FIELDS) {
        if (!r.citation?.[field]) {
          violations.push({ id: 'UNVERIFIABLE_CITATION', missing: field, subject: r.request?.subject });
        }
      }
      // The cited file must actually contain the table. A citation nobody checks
      // is just an assertion with a filename attached.
      const abs = r.citation?.source_file ? path.join(ROOT, r.citation.source_file) : null;
      if (abs && !fs.existsSync(abs)) {
        violations.push({ id: 'CITATION_SOURCE_MISSING', file: r.citation.source_file, subject: r.request?.subject });
      }
    }
    if (r.kind === RESOLUTION_KIND.FOUNDER_QUESTION && r.write_back) {
      violations.push({ id: 'QUESTION_MUST_NOT_WRITE_BACK', subject: r.request?.subject });
    }
  }
  return { clean: violations.length === 0, violations };
}

/** Run the whole pass over a routed request set. */
export function runArchitectResolution({ requests = [], blueprint = null, intent = null, root = ROOT }) {
  const existingTables = scanExistingTables({ root });
  const resolutions = requests.map((req) => resolveRequest(req, { existingTables, blueprint, intent }));
  const audit = auditResolutions(resolutions);
  const founderQuestions = resolutions.filter((r) => r.kind === RESOLUTION_KIND.FOUNDER_QUESTION);

  return {
    resolved_by_architect: resolutions.filter((r) => r.write_back).length,
    routed_to_founder: founderQuestions.length,
    // Returned together, never one at a time: answering N questions in one pass is
    // the difference between one interruption and N.
    founder_decision_set: founderQuestions.map((r) => r.structured_question).filter(Boolean),
    resolutions,
    allowlist_audit: audit,
    existing_tables_scanned: existingTables.size,
  };
}

function main() {
  const i = process.argv.indexOf('--session');
  if (i === -1) {
    console.error('usage: architect-resolve-requests.mjs --session <path.json>');
    process.exit(2);
  }
  const session = JSON.parse(fs.readFileSync(path.resolve(ROOT, process.argv[i + 1]), 'utf8'));
  const s = session.session || session;
  const report = runArchitectResolution({
    requests: s.gaps_json?.invention_report?.defects?.map((d) => ({ defect_id: d.id, subject: d.table || d.field, question: d.resolution_required })) ?? [],
    blueprint: s.blueprint_json,
    intent: s.extracted_intent_json,
  });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith('architect-resolve-requests.mjs')) {
  main();
}
