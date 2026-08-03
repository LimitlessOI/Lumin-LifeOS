#!/usr/bin/env node
/**
 * SYNOPSIS: verify-constitutional-amendment-ratification.mjs
 * Hard-blocks any commit that edits docs/constitution/NORTH_STAR_SSOT.md unless
 * the same commit also stages a ratification record satisfying Article VII's
 * own four requirements (unanimous AI Council vote, Human Guardian written
 * approval, documented rationale, >=7-day review period).
 *
 * This does not invent new constitutional requirements -- it makes the four
 * requirements Article VII already states machine-checkable, closing the gap
 * that let commit 6a5b608fb rewrite Article I and add SS2.0M while declaring
 * itself "RATIFIED" in the commit message with no vote, no founder approval,
 * and no review period on record anywhere.
 *
 * Usage: node scripts/verify-constitutional-amendment-ratification.mjs --staged
 * Exit 0 = no violation (either the constitution wasn't touched, or a valid
 * ratification record was staged alongside it). Exit 1 = hard block.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const CONSTITUTION_PATH = 'docs/constitution/NORTH_STAR_SSOT.md';
const RECORDS_DIR_REL = 'data/constitutional-framework/ratification-records';
const MIN_REVIEW_DAYS = 7;

function getStagedFiles() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACMR', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function validateRecord(rec) {
  const problems = [];
  if (!rec || rec.schema !== 'constitutional_amendment_ratification_v1') {
    problems.push('schema must be "constitutional_amendment_ratification_v1"');
  }
  if (!rec.ai_council_vote || rec.ai_council_vote.unanimous !== true) {
    problems.push('ai_council_vote.unanimous must be true (Article VII requirement 1)');
  }
  if (!Array.isArray(rec.ai_council_vote?.voters) || rec.ai_council_vote.voters.length === 0) {
    problems.push('ai_council_vote.voters must be a non-empty list of who voted');
  }
  if (!rec.human_guardian_approval?.approved_by) {
    problems.push('human_guardian_approval.approved_by is missing (Article VII requirement 2)');
  }
  if (!rec.human_guardian_approval?.approved_at) {
    problems.push('human_guardian_approval.approved_at is missing');
  }
  if (!rec.rationale || String(rec.rationale).trim().length < 20) {
    problems.push('rationale is missing or too short (Article VII requirement 3)');
  }
  const proposedAt = rec.review_period?.proposed_at ? new Date(rec.review_period.proposed_at) : null;
  const enactedAt = rec.review_period?.enacted_at ? new Date(rec.review_period.enacted_at) : null;
  if (!proposedAt || isNaN(proposedAt.getTime()) || !enactedAt || isNaN(enactedAt.getTime())) {
    problems.push('review_period.proposed_at / enacted_at missing or invalid dates');
  } else {
    const daysElapsed = (enactedAt.getTime() - proposedAt.getTime()) / 86_400_000;
    if (daysElapsed < MIN_REVIEW_DAYS) {
      problems.push(`review_period is only ${daysElapsed.toFixed(1)} days (Article VII requirement 4: >= ${MIN_REVIEW_DAYS})`);
    }
  }
  if (!rec.affected_sections || !Array.isArray(rec.affected_sections) || rec.affected_sections.length === 0) {
    problems.push('affected_sections must list which Articles/sections this amendment touches');
  }
  return problems;
}

function main() {
  const stagedMode = process.argv.includes('--staged');
  const changedFiles = stagedMode ? getStagedFiles() : [];
  const touchesConstitution = stagedMode
    ? changedFiles.includes(CONSTITUTION_PATH)
    : fs.existsSync(path.join(ROOT, CONSTITUTION_PATH));

  if (!touchesConstitution) {
    console.log('✅ verify-constitutional-amendment-ratification: NORTH_STAR_SSOT.md not touched, skipping.');
    process.exit(0);
  }
  if (!stagedMode) {
    console.log('ℹ️  verify-constitutional-amendment-ratification: report-only mode (pass --staged for the enforcing pre-commit check).');
    process.exit(0);
  }

  const stagedRecordFiles = changedFiles.filter(
    (f) => f.startsWith(`${RECORDS_DIR_REL}/`) && f.endsWith('.json')
  );

  if (stagedRecordFiles.length === 0) {
    console.error('\n❌ CONSTITUTIONAL AMENDMENT RATIFICATION — commit blocked.');
    console.error(`   docs/constitution/NORTH_STAR_SSOT.md is staged, but no ratification record`);
    console.error(`   is staged alongside it under ${RECORDS_DIR_REL}/.`);
    console.error('   Article VII requires: unanimous AI Council vote + Human Guardian written');
    console.error('   approval + documented rationale + >=7-day review period BEFORE enactment —');
    console.error('   not after. Create the record first, let the review period elapse, then commit.');
    process.exit(1);
  }

  let anyValid = false;
  const allProblems = [];
  for (const relPath of stagedRecordFiles) {
    const absPath = path.join(ROOT, relPath);
    let rec;
    try {
      rec = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    } catch (err) {
      allProblems.push(`${relPath}: could not parse JSON (${err.message})`);
      continue;
    }
    const problems = validateRecord(rec);
    if (problems.length === 0) {
      anyValid = true;
      console.log(`✅ Valid ratification record: ${relPath}`);
    } else {
      allProblems.push(`${relPath}: ${problems.join('; ')}`);
    }
  }

  if (!anyValid) {
    console.error('\n❌ CONSTITUTIONAL AMENDMENT RATIFICATION — commit blocked.');
    console.error('   Ratification record(s) staged, but none satisfy Article VII in full:');
    for (const p of allProblems) console.error(`   - ${p}`);
    process.exit(1);
  }

  console.log('✅ CONSTITUTIONAL AMENDMENT RATIFICATION — verified.');
  process.exit(0);
}

main();
