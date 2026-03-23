/**
 * services/autonomy-orchestrator.js
 *
 * The brain of autonomous self-programming.
 * Adam is never the bottleneck for routine work.
 *
 * Runs every 15 minutes. Does this in order:
 *   1. Pull pending improvement proposals from DB
 *   2. Risk-score each one
 *   3. Risk 1-2 → auto-approve + generate components + build
 *   4. Risk 3-4 → SMS Adam with Y/N code — wait for reply via /autonomy/sms
 *   5. Risk 5-6 → log + notify, skip until manual action
 *   6. After each build attempt → health-check the server
 *   7. If health fails → auto-create rollback idea + SMS Adam
 *
 * Also runs the "component generator" — takes plain English idea → structured
 * {id, name, file, type, prompt} components[] the auto-builder needs.
 *
 * Exports: createAutonomyOrchestrator(deps) → { start, stop, getStatus, approvePendingSMS }
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

import { scoreIdea } from './risk-scorer.js';
import { addProductToQueue } from '../core/auto-builder.js';
import crypto from 'crypto';

const CYCLE_INTERVAL_MS   = 15 * 60 * 1000; // 15 minutes
const HEALTH_CHECK_URL    = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `${process.env.RAILWAY_PUBLIC_DOMAIN}/health`
  : 'http://localhost:8080/health';
const HEALTH_CHECK_DELAY_MS = 3 * 60 * 1000; // wait 3 min after build before health check
const SMS_APPROVAL_TTL_MS   = 30 * 60 * 1000; // SMS approvals expire after 30 min

// In-memory store for pending SMS approvals
// { code → { ideaId, proposalId, expiresAt, description } }
const pendingSMSApprovals = new Map();

export function createAutonomyOrchestrator({
  pool,
  callAI,             // callCouncilMember adapter
  sendSMS,            // fn(to, message) → { success }
  adminPhone,         // phone number to SMS Adam
  addProductToQueueFn, // override for testing
}) {
  const queueFn = addProductToQueueFn || addProductToQueue;
  let timer = null;
  let running = false;
  let lastCycleAt = null;
  let lastCycleResult = null;

  // Must be declared here (top of factory scope) — workNextProject is hoisted but
  // const declarations are not, causing TDZ error if declared near workNextProject.
  const PROJECT_RETRIGGER_MS = 2 * 60 * 60 * 1000;

  // ── Main orchestration cycle ────────────────────────────────────────────────
  async function runCycle() {
    if (running) return { skipped: true };
    running = true;
    lastCycleAt = new Date().toISOString();

    console.log('\n🤖 [AUTONOMY] Orchestration cycle starting');

    const results = {
      autoApproved: 0,
      smsSent: 0,
      skippedHighRisk: 0,
      buildsQueued: 0,
      errors: [],
    };

    try {
      // 1. Fetch pending proposals (from continuous improvement monitor)
      const proposals = await getPendingProposals();
      // 2. Fetch approved ideas that have no build queued yet
      const approvedIdeas = await getApprovedUnbuiltIdeas();

      console.log(`[AUTONOMY] ${proposals.length} proposals + ${approvedIdeas.length} approved ideas`);

      // ── Process proposals ─────────────────────────────────────────────────
      for (const proposal of proposals) {
        try {
          const risk = scoreIdea({
            title: proposal.title || proposal.proposal_type,
            description: proposal.description || proposal.details,
            category: proposal.proposal_type,
          });

          console.log(`[AUTONOMY] Proposal "${proposal.title}" → risk ${risk.score} (${risk.label})`);

          if (risk.autoApprove) {
            // Auto-approve: promote to idea + queue build
            const idea = await promoteProposalToIdea(proposal);
            if (idea) {
              const queued = await generateComponentsAndQueue(idea, callAI, queueFn);
              if (queued) {
                results.autoApproved++;
                results.buildsQueued++;
                console.log(`✅ [AUTONOMY] Auto-approved + queued: "${proposal.title}"`);
              }
            }

          } else if (risk.needsSMS && adminPhone && sendSMS) {
            // SMS Adam for approval
            const code = generateCode();
            const message = buildApprovalSMS(proposal.title || proposal.proposal_type, risk, code);
            const smsResult = await sendSMS(adminPhone, message);

            if (smsResult?.success !== false) {
              pendingSMSApprovals.set(code, {
                type: 'proposal',
                proposalId: proposal.id,
                expiresAt: Date.now() + SMS_APPROVAL_TTL_MS,
                description: proposal.title || proposal.proposal_type,
                risk,
              });
              // Mark proposal as awaiting_approval in DB
              await pool.query(
                `UPDATE improvement_proposals SET status = 'awaiting_sms_approval' WHERE id = $1`,
                [proposal.id]
              ).catch(() => {});
              results.smsSent++;
              console.log(`📱 [AUTONOMY] SMS sent for approval: "${proposal.title}" (code: ${code})`);
            }

          } else if (risk.needsManual) {
            results.skippedHighRisk++;
            // Notify but don't block — Adam can log in and approve manually
            if (adminPhone && sendSMS && risk.score === 5) {
              await sendSMS(adminPhone,
                `⚠️ Auto-builder found a high-risk improvement that needs your review:\n"${proposal.title}"\nLog in to approve: ${process.env.RAILWAY_PUBLIC_DOMAIN}/command-center`
              ).catch(() => {});
            }
            console.log(`⏸️ [AUTONOMY] Skipped (risk ${risk.score}): "${proposal.title}"`);
          }

        } catch (err) {
          results.errors.push(`Proposal ${proposal.id}: ${err.message}`);
          console.error(`[AUTONOMY] Error processing proposal ${proposal.id}:`, err.message);
        }
      }

      // ── Process already-approved ideas that need component generation ──────
      for (const idea of approvedIdeas) {
        try {
          console.log(`[AUTONOMY] Generating components for approved idea: "${idea.title}"`);
          const queued = await generateComponentsAndQueue(idea, callAI, queueFn);
          if (queued) {
            results.buildsQueued++;
            // Mark idea as build_queued
            await pool.query(
              `UPDATE ideas SET status = 'build_queued', updated_at = NOW() WHERE id = $1`,
              [idea.id]
            ).catch(() => {});
            console.log(`✅ [AUTONOMY] Build queued for: "${idea.title}"`);
          }
        } catch (err) {
          results.errors.push(`Idea ${idea.id}: ${err.message}`);
        }
      }

      // ── Project backlog fallback ───────────────────────────────────────────
      // If nothing in the manual idea queue, work through the project backlog.
      // One project active at a time. Only re-trigger a project every 2 hours
      // to avoid hammering the same project every 15-min cycle.
      const queueEmpty = proposals.length === 0 && approvedIdeas.length === 0;
      if (queueEmpty) {
        const projectResult = await workNextProject();
        if (projectResult?.queued) {
          results.buildsQueued++;
          console.log(`📋 [AUTONOMY] Project fallback: queued tasks for "${projectResult.projectName}"`);
        }
      }

      // ── Expire stale SMS approvals ────────────────────────────────────────
      const now = Date.now();
      for (const [code, approval] of pendingSMSApprovals.entries()) {
        if (approval.expiresAt < now) {
          pendingSMSApprovals.delete(code);
          console.log(`[AUTONOMY] SMS approval expired: ${code}`);
        }
      }

    } catch (err) {
      results.errors.push(`Cycle error: ${err.message}`);
      console.error('[AUTONOMY] Cycle error:', err.message);
    } finally {
      running = false;
      lastCycleResult = results;
    }

    console.log(`🤖 [AUTONOMY] Cycle done: ${JSON.stringify(results)}\n`);
    return results;
  }

  // ── SMS approval handler (called from the route when Adam replies) ─────────
  async function approvePendingSMS(code, approved) {
    const pending = pendingSMSApprovals.get(code);
    if (!pending) {
      return { error: 'Unknown or expired approval code' };
    }

    pendingSMSApprovals.delete(code);

    if (!approved) {
      // Rejected — mark proposal/idea as skipped
      if (pending.type === 'proposal') {
        await pool.query(
          `UPDATE improvement_proposals SET status = 'sms_rejected' WHERE id = $1`,
          [pending.proposalId]
        ).catch(() => {});
      }
      console.log(`[AUTONOMY] SMS rejected: ${pending.description} (code: ${code})`);
      return { approved: false, description: pending.description };
    }

    // Approved — promote and build
    try {
      if (pending.type === 'proposal') {
        const idea = await promoteProposalToIdea({ id: pending.proposalId, title: pending.description });
        if (idea) {
          await generateComponentsAndQueue(idea, callAI, queueFn);
          console.log(`✅ [AUTONOMY] SMS-approved build queued: ${pending.description}`);
        }
      } else if (pending.type === 'idea') {
        // Already an idea — just generate components and queue
        const { rows } = await pool.query('SELECT * FROM ideas WHERE id = $1', [pending.ideaId]);
        if (rows[0]) {
          await generateComponentsAndQueue(rows[0], callAI, queueFn);
        }
      }
      return { approved: true, description: pending.description, buildQueued: true };
    } catch (err) {
      return { approved: true, error: err.message };
    }
  }

  // ── Health check after a build ────────────────────────────────────────────
  async function healthCheckAfterBuild(delayMs = HEALTH_CHECK_DELAY_MS) {
    await new Promise(r => setTimeout(r, delayMs));
    try {
      const res = await fetch(HEALTH_CHECK_URL, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        console.log('[AUTONOMY] ✅ Post-build health check passed');
        return { healthy: true };
      }
      throw new Error(`Health endpoint returned ${res.status}`);
    } catch (err) {
      console.error('[AUTONOMY] ❌ Post-build health check FAILED:', err.message);
      if (adminPhone && sendSMS) {
        await sendSMS(adminPhone,
          `🚨 Auto-builder health check FAILED after deploy.\nError: ${err.message}\nCheck: ${HEALTH_CHECK_URL}`
        ).catch(() => {});
      }
      return { healthy: false, error: err.message };
    }
  }

  // ── Start / stop ──────────────────────────────────────────────────────────
  function start(opts = {}) {
    const interval = opts.interval ?? CYCLE_INTERVAL_MS;
    if (timer) return;

    // First run after 2 minutes (let server finish booting)
    setTimeout(() => {
      runCycle().catch(err => console.error('[AUTONOMY] Initial cycle error:', err.message));
      timer = setInterval(() => {
        runCycle().catch(err => console.error('[AUTONOMY] Cycle error:', err.message));
      }, interval);
    }, 2 * 60 * 1000);

    console.log(`🤖 [AUTONOMY] Orchestrator started (interval: ${interval / 60000} min)`);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    console.log('[AUTONOMY] Orchestrator stopped');
  }

  function getStatus() {
    return {
      running,
      lastCycleAt,
      lastCycleResult,
      pendingSMSApprovals: pendingSMSApprovals.size,
      pendingCodes: [...pendingSMSApprovals.entries()].map(([code, v]) => ({
        code,
        description: v.description,
        expiresAt: new Date(v.expiresAt).toISOString(),
        riskScore: v.risk?.score,
      })),
    };
  }

  return { start, stop, getStatus, approvePendingSMS, runCycle, healthCheckAfterBuild, completeProject, skipProject };

  // ── Internal helpers ───────────────────────────────────────────────────────

  // Project backlog: pick the active project (or promote next pending one) and
  // queue build tasks for it. Re-triggers at most once every 2 hours per project.
  async function workNextProject() {
    if (!pool) return null;
    try {
      // Find currently active project
      let { rows } = await pool.query(
        `SELECT * FROM project_backlog WHERE status = 'active' ORDER BY priority ASC LIMIT 1`
      );

      // If none active, promote the highest-priority pending one
      if (rows.length === 0) {
        const pending = await pool.query(
          `SELECT * FROM project_backlog WHERE status = 'pending' ORDER BY priority ASC LIMIT 1`
        );
        if (pending.rows.length === 0) {
          console.log('[AUTONOMY] Project backlog exhausted — all projects complete or skipped');
          return null;
        }
        await pool.query(
          `UPDATE project_backlog SET status = 'active' WHERE id = $1`,
          [pending.rows[0].id]
        );
        rows = pending.rows;
        console.log(`📋 [AUTONOMY] Activated project: "${rows[0].name}"`);
      }

      const project = rows[0];

      // Throttle: don't re-trigger within 2 hours of the last trigger
      if (project.last_triggered_at) {
        const elapsed = Date.now() - new Date(project.last_triggered_at).getTime();
        if (elapsed < PROJECT_RETRIGGER_MS) {
          console.log(`[AUTONOMY] Project "${project.name}" triggered recently — waiting ${Math.round((PROJECT_RETRIGGER_MS - elapsed) / 60000)} min`);
          return null;
        }
      }

      // Generate components and queue the build
      const queued = await generateComponentsAndQueue(
        { id: `project_${project.id}`, title: project.name, description: project.description },
        callAI,
        queueFn
      );

      if (queued) {
        await pool.query(
          `UPDATE project_backlog SET last_triggered_at = NOW() WHERE id = $1`,
          [project.id]
        ).catch(() => {});
      }

      return { queued, projectName: project.name, projectId: project.id };
    } catch (err) {
      console.error('[AUTONOMY] workNextProject error:', err.message);
      return null;
    }
  }

  // Mark a project complete (called from route or manually)
  async function completeProject(projectId) {
    if (!pool) return;
    await pool.query(
      `UPDATE project_backlog SET status = 'complete', completed_at = NOW() WHERE id = $1`,
      [projectId]
    );
    console.log(`✅ [AUTONOMY] Project ${projectId} marked complete`);
  }

  // Skip a project and move on
  async function skipProject(projectId) {
    if (!pool) return;
    await pool.query(
      `UPDATE project_backlog SET status = 'skipped' WHERE id = $1`,
      [projectId]
    );
    console.log(`⏭️ [AUTONOMY] Project ${projectId} skipped`);
  }

  async function getPendingProposals() {
    if (!pool) return [];
    try {
      const { rows } = await pool.query(`
        SELECT * FROM improvement_proposals
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 10
      `);
      return rows;
    } catch { return []; }
  }

  async function getApprovedUnbuiltIdeas() {
    if (!pool) return [];
    try {
      const { rows } = await pool.query(`
        SELECT * FROM ideas
        WHERE approval_status = 'approved'
          AND status NOT IN ('build_queued', 'in_progress', 'complete', 'built')
        ORDER BY approved_at ASC
        LIMIT 5
      `);
      return rows;
    } catch { return []; }
  }

  async function promoteProposalToIdea(proposal) {
    if (!pool) return null;
    try {
      // Mark proposal approved
      await pool.query(
        `UPDATE improvement_proposals SET status = 'approved' WHERE id = $1`,
        [proposal.id]
      );
      // Create idea
      const { rows } = await pool.query(`
        INSERT INTO ideas (title, description, source, approval_status, approved_at, status, created_at)
        VALUES ($1, $2, 'autonomy_orchestrator', 'approved', NOW(), 'approved', NOW())
        RETURNING *
      `, [
        proposal.title || proposal.proposal_type,
        proposal.description || proposal.details || '',
      ]);
      return rows[0];
    } catch (err) {
      console.error('[AUTONOMY] promoteProposalToIdea failed:', err.message);
      return null;
    }
  }
}

// ── Component generator — the critical bridge ─────────────────────────────────
// Takes plain English idea → structured components[] the auto-builder needs.
async function generateComponentsAndQueue(idea, callAI, queueFn) {
  const prompt = `You are a software architect. Generate a build plan for this feature idea.

IDEA TITLE: ${idea.title}
DESCRIPTION: ${idea.description || ''}

Generate the minimal set of NEW files needed to implement this. Return ONLY valid JSON array.

Rules:
- New files only — never list existing files
- Maximum 4 components per idea (split large ideas into phases)
- SQL migrations → db/migrations/YYYYMMDD_snake_name.sql
- Routes → routes/feature-name-routes.js
- Services → services/feature-name.js
- Products (web apps) → products/feature-name/index.html
- Each prompt must be a complete, standalone build instruction for that file

Today's date: ${new Date().toISOString().slice(0,10)}

Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Start your response with [ and end with ].

Example shape:
[
  {
    "id": "snake_case_id",
    "name": "Human readable name",
    "file": "relative/path/to/file.ext",
    "type": "js|html|css|sql",
    "prompt": "Complete detailed prompt for this file only"
  }
]`;

  let components = null;
  try {
    const raw = await callAI('code_generation', prompt);
    const text = (typeof raw === 'string' ? raw : raw?.content || raw?.text || '').trim();
    // Extract JSON array
    const start = text.indexOf('[');
    const end   = text.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error('No JSON array in response');
    components = JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    console.error('[AUTONOMY] Component generation failed:', err.message);
    return false;
  }

  if (!Array.isArray(components) || components.length === 0) {
    console.warn('[AUTONOMY] Component generator returned empty array');
    return false;
  }

  // Validate each component has required fields
  const valid = components.filter(c => c.id && c.file && c.type && c.prompt && c.prompt.length > 50);
  if (valid.length === 0) {
    console.warn('[AUTONOMY] No valid components generated');
    return false;
  }

  const productId = `idea_${idea.id}_${Date.now()}`;
  queueFn({
    id: productId,
    name: idea.title,
    description: idea.description || '',
    ideaId: idea.id,
    components: valid.map(c => ({ ...c, status: 'pending', lastError: null })),
  });

  return true;
}

function generateCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A3F7B2"
}

function buildApprovalSMS(title, risk, code) {
  return `🤖 Auto-builder wants to build:\n"${title}"\n\nRisk: ${risk.score}/6 — ${risk.label}\nReason: ${risk.reasons[0]}\n\nReply YES-${code} to approve or NO-${code} to skip.\nExpires in 30 min.`;
}
