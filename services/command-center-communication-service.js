/**
 * SYNOPSIS: Command Center communication history + C2-backed operator messaging.
 * Command Center communication history + C2-backed operator messaging.
 * NOT canonical BuilderOS memory — separate from epistemic_facts.
 *
 * @ssot docs/products/command-center/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  createCommandControlJob,
  getCommandControlJob,
} from './builderos-command-control-service.js';
import { executeCommandControlJob } from './builderos-governed-loop-executor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const C2_COMMUNICATION_MODES = Object.freeze({
  quick_ask: {
    label: 'Quick Ask',
    frame: (text) => `QUICK ASK — answer clearly, state uncertainty, and keep only verified repo/runtime claims.\n\n${text}`,
  },
  brainstorm: {
    label: 'Brainstorming',
    frame: (text) => `BRAINSTORM — list options, tradeoffs, and unknowns. No invented file paths.\n\n${text}`,
  },
  step_build: {
    label: 'Step-by-step Build',
    frame: (text) => `STEP-BY-STEP BUILD — smallest safe diffs first, cite controlling blueprint, verified repo paths only.\n\n${text}`,
  },
  audit: {
    label: 'Audit / Verify',
    frame: (text) => `AUDIT — verify against runtime and repo truth only. Mark UNVERIFIED when proof is missing.\n\n${text}`,
  },
  meeting: {
    label: 'Meeting Mode',
    frame: (text) => `MEETING — structure as Context / Options / Recommendation / Decision needed.\n\n${text}`,
  },
  c2_command: {
    label: 'C2 Command',
    frame: (text) => `C2 COMMAND — execute through governed BuilderOS Command & Control. Preserve OIL/PBB/verifier gates.\n\n${text}`,
  },
});

const TEMPLATE_PATH_PATTERNS = [
  { re: /currentRepo\//i, reason: 'placeholder prefix currentRepo/' },
  { re: /\bchatInterface\.js\b(?![\s\S]{0,40}(?:public\/|overlay\/))/i, reason: 'bare chatInterface.js without verified overlay path' },
  { re: /path\/to\//i, reason: 'template path path/to/' },
  { re: /your-repo\//i, reason: 'template path your-repo/' },
  { re: /example\.(com|org)\//i, reason: 'example domain path' },
  { re: /\/tmp\/builder-/i, reason: 'temp builder path (not committed repo file)' },
];

const FILE_PATH_RE = /\b(?:scripts|routes|services|public|docs|config|startup|db|middleware|core|prompts)\/[A-Za-z0-9._\-/]+\.(?:js|mjs|cjs|ts|tsx|sql|md|html|json)\b/g;
const ROUTE_RE = /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/api\/v1\/[^\s'"`,]+/gi;

function unique(arr) {
  return [...new Set(arr)];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function deriveThreadTitle(text) {
  const normalized = normalizeText(text).replace(/\s+/g, ' ');
  if (!normalized) return 'Command Center Thread';
  return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
}

export function buildCommunicationPrompt(mode, text) {
  const def = C2_COMMUNICATION_MODES[mode] || C2_COMMUNICATION_MODES.quick_ask;
  return def.frame(normalizeText(text));
}

function summarizeExecution(trace = {}, job = {}) {
  const builderOutput = trace.builder_output || {};
  const kernelReceipts = builderOutput.kernel_receipts || {};
  const parts = [
    `C2 job ${job.id || 'unknown'} finished with status ${job.status || 'unknown'}.`,
  ];

  if (builderOutput.target_file) {
    parts.push(`Target: ${builderOutput.target_file}.`);
  }
  if (builderOutput.model_used) {
    parts.push(`Model: ${builderOutput.model_used}.`);
  }
  if (builderOutput.committed === true || job.status === 'committed') {
    parts.push('BuilderOS committed the change.');
  } else if (job.blocker) {
    parts.push(`Blocked by ${job.blocker}.`);
  }
  if (kernelReceipts.oil?.verified === true) {
    parts.push(`OIL verified (${kernelReceipts.oil.id || 'receipt'}).`);
  }
  if (kernelReceipts.token?.verified === true) {
    parts.push(`Token receipt linked (${kernelReceipts.token.id || 'receipt'}).`);
  }
  if (trace.repair_loop_result?.retry_used) {
    parts.push('Repair loop used one retry.');
  }

  return parts.join(' ');
}

export function extractCandidateFilePaths(text) {
  const raw = String(text || '');
  const matches = raw.match(FILE_PATH_RE) || [];
  return unique(matches.map((p) => p.replace(/^[`'"]+|[`'"]+$/g, '')));
}

export function extractCandidateRoutes(text) {
  const raw = String(text || '');
  const matches = raw.match(ROUTE_RE) || [];
  return unique(matches.map((route) => route.trim()));
}

export function detectPlaceholderClaims(text) {
  const raw = String(text || '');
  const hits = [];
  for (const { re, reason } of TEMPLATE_PATH_PATTERNS) {
    if (re.test(raw)) hits.push(reason);
  }
  return hits;
}

export function verifyRepoFilePaths(paths) {
  return paths.map((filePath) => {
    const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
    const abs = path.join(ROOT, normalized);
    let exists = false;
    try {
      exists = fs.existsSync(abs) && fs.statSync(abs).isFile();
    } catch {
      exists = false;
    }
    return { path: normalized, exists };
  });
}

export function buildCommunicationEvidence({
  responseText = '',
  endpointsUsed = [],
  builderMeta = {},
  deploySha = null,
} = {}) {
  const placeholderWarnings = detectPlaceholderClaims(responseText);
  const extractedPaths = extractCandidateFilePaths(responseText);
  const filesChecked = verifyRepoFilePaths(extractedPaths);
  const routesChecked = unique([
    ...endpointsUsed,
    ...extractCandidateRoutes(responseText),
  ]);

  const missingFiles = filesChecked.filter((f) => !f.exists);
  const verifiedFiles = filesChecked.filter((f) => f.exists);
  const hasRepoFileClaims = filesChecked.length > 0;
  const advisoryOnly = builderMeta.advisory_only === true
    || (builderMeta.execution_only === false && !builderMeta.committed)
    || (hasRepoFileClaims && missingFiles.length > 0)
    || placeholderWarnings.length > 0;

  let evidence_status = 'UNVERIFIED';
  if (
    placeholderWarnings.length === 0
    && (!hasRepoFileClaims || missingFiles.length === 0)
    && endpointsUsed.length > 0
    && !advisoryOnly
  ) {
    evidence_status = 'VERIFIED';
  } else if (
    placeholderWarnings.length === 0
    && verifiedFiles.length > 0
    && endpointsUsed.length > 0
  ) {
    evidence_status = 'PARTIAL';
  }

  const warnings = [];
  if (placeholderWarnings.length) {
    warnings.push('Response cites placeholder or template paths — treat as advisory only.');
  }
  if (missingFiles.length) {
    warnings.push(`Cited file(s) not found in repo: ${missingFiles.map((f) => f.path).join(', ')}`);
  }
  if (!endpointsUsed.length) {
    warnings.push('No live API endpoints recorded for this exchange.');
  }
  if (builderMeta.committed !== true && hasRepoFileClaims) {
    warnings.push('No committed build linked — file claims are unverified.');
  }
  if (advisoryOnly && evidence_status !== 'VERIFIED') {
    warnings.push('Advisory-only response — council did not prove repo access.');
  }

  return {
    evidence_status,
    files_checked: filesChecked,
    routes_checked: routesChecked,
    commands_or_endpoints_used: endpointsUsed,
    commit_sha: builderMeta.commit_sha || builderMeta.commitSha || null,
    railway_sha: deploySha || builderMeta.railway_sha || null,
    model_used: builderMeta.model_used || builderMeta.modelUsed || null,
    committed: builderMeta.committed === true,
    placeholder_warnings: placeholderWarnings,
    advisory_only: advisoryOnly,
    warnings: unique(warnings),
    proof_source: 'command_center_communication_guard',
    do_not_use_for_builderos_memory_proof: true,
  };
}

export async function insertCommunication(pool, row) {
  const result = await pool.query(
    `INSERT INTO command_center_communications
       (thread_id, thread_title, speaker, council_member, mode, domain,
        transcript, response_text, evidence_json, builder_job_id, commit_sha, railway_sha,
        message_type, transport, status, selected_voice, playback_rate, explicit_send,
        parent_message_id, command_control_job_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING *`,
    [
      row.thread_id || randomUUID(),
      row.thread_title || deriveThreadTitle(row.transcript || row.response_text || ''),
      row.speaker || 'adam',
      row.council_member || null,
      row.mode || 'quick_ask',
      row.domain || null,
      row.transcript || '',
      row.response_text || null,
      row.evidence_json || {},
      row.builder_job_id || null,
      row.commit_sha || null,
      row.railway_sha || null,
      row.message_type || 'exchange',
      row.transport || 'text',
      row.status || 'recorded',
      row.selected_voice || null,
      row.playback_rate ?? 1.0,
      row.explicit_send !== false,
      row.parent_message_id || null,
      row.command_control_job_id || null,
    ],
  );
  return result.rows[0];
}

export async function listCommunications(pool, {
  limit = 50,
  q = '',
  threadId = '',
  mode = '',
  messageType = '',
} = {}) {
  const capped = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const clauses = [];
  const params = [];
  let idx = 1;

  if (q) {
    clauses.push(`(transcript ILIKE $${idx} OR response_text ILIKE $${idx} OR COALESCE(thread_title, '') ILIKE $${idx})`);
    params.push(`%${q}%`);
    idx += 1;
  }
  if (threadId) {
    clauses.push(`thread_id = $${idx}::uuid`);
    params.push(threadId);
    idx += 1;
  }
  if (mode) {
    clauses.push(`mode = $${idx}`);
    params.push(mode);
    idx += 1;
  }
  if (messageType) {
    clauses.push(`message_type = $${idx}`);
    params.push(messageType);
    idx += 1;
  }

  params.push(capped);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT id, thread_id, thread_title, speaker, council_member, mode, domain,
            transcript, response_text, evidence_json, builder_job_id, commit_sha, railway_sha,
            message_type, transport, status, selected_voice, playback_rate, explicit_send,
            parent_message_id, command_control_job_id, created_at
       FROM command_center_communications
      ${where}
      ORDER BY created_at DESC
      LIMIT $${idx}`,
    params,
  );
  return result.rows;
}

async function updateCommunicationAfterExecution(pool, id, updates) {
  await pool.query(
    `UPDATE command_center_communications
        SET response_text = $2,
            status        = $3,
            evidence_json = $4,
            commit_sha    = $5,
            railway_sha   = $6,
            builder_job_id = $7
      WHERE id = $1`,
    [id, updates.response_text, updates.status, updates.evidence_json,
      updates.commit_sha, updates.railway_sha, updates.builder_job_id],
  );
}

export async function getThreadWithJobStatus(pool, threadId) {
  const result = await pool.query(
    `SELECT c.id, c.thread_id, c.thread_title, c.speaker, c.council_member,
            c.mode, c.domain, c.transcript, c.response_text, c.evidence_json,
            c.builder_job_id, c.commit_sha, c.railway_sha, c.message_type,
            c.transport, c.status, c.selected_voice, c.playback_rate, c.explicit_send,
            c.parent_message_id, c.command_control_job_id, c.created_at,
            j.status        AS job_status,
            j.blocker       AS job_blocker,
            j.updated_at    AS job_updated_at
       FROM command_center_communications c
       LEFT JOIN builderos_command_control_jobs j ON j.id = c.command_control_job_id
      WHERE c.thread_id = $1::uuid
      ORDER BY c.created_at ASC`,
    [threadId],
  );
  return result.rows;
}

const THREAD_CTX_PAIRS = 5;
const THREAD_CTX_MSG_CHARS = 300;
const THREAD_CTX_MAX_CHARS = 3000;

async function getRecentThreadContext(pool, threadId, beforeMessageId) {
  if (!threadId) return [];
  const result = await pool.query(
    `SELECT speaker, message_type, transcript, response_text
       FROM command_center_communications
      WHERE thread_id = $1::uuid
        AND id != $2::uuid
      ORDER BY created_at DESC
      LIMIT $3`,
    [threadId, beforeMessageId, THREAD_CTX_PAIRS * 2],
  );
  return result.rows.reverse();
}

function buildThreadContextBlock(messages) {
  if (!messages || messages.length === 0) return '';
  let total = 0;
  const lines = [];
  for (const m of messages) {
    const label = m.speaker === 'adam' ? 'Adam' : 'System';
    const raw = m.speaker === 'adam'
      ? (m.transcript || '')
      : (m.response_text || m.transcript || '');
    const clipped = raw.slice(0, THREAD_CTX_MSG_CHARS);
    const line = `[${label}] ${clipped}${raw.length > THREAD_CTX_MSG_CHARS ? '…' : ''}`;
    total += line.length;
    if (total > THREAD_CTX_MAX_CHARS) break;
    lines.push(line);
  }
  if (lines.length === 0) return '';
  return `=== PRIOR CONVERSATION (${lines.length} message${lines.length === 1 ? '' : 's'}) ===\n${lines.join('\n')}\n\n=== CURRENT ===\n`;
}

function buildBuilderMetaFromJob(job, deploySha) {
  const trace = job?.result_json?.trace || {};
  const builderOutput = trace.builder_output || {};
  return {
    committed: job?.status === 'committed' || builderOutput.committed === true,
    commit_sha: builderOutput.raw?.commit_sha || job?.result_json?.commit_sha || null,
    railway_sha: deploySha || null,
    model_used: builderOutput.model_used || null,
    execution_only: true,
    advisory_only: false,
  };
}

export async function sendCommunicationViaC2(pool, payload = {}, options = {}) {
  const text = normalizeText(payload.transcript || payload.text);
  if (!text) {
    return { ok: false, error: 'transcript is required' };
  }

  const mode = normalizeText(payload.mode) || 'c2_command';
  const domain = normalizeText(payload.domain) || 'lifeos-core';
  const threadId = normalizeText(payload.thread_id) || randomUUID();
  const threadTitle = normalizeText(payload.thread_title) || deriveThreadTitle(text);
  const transport = normalizeText(payload.transport) || 'text';
  const selectedVoice = normalizeText(payload.selected_voice) || null;
  const playbackRate = Number(payload.playback_rate || 1) || 1;
  const explicitSend = payload.explicit_send !== false;
  const deploySha = payload.deploy_sha || null;

  const userMessage = await insertCommunication(pool, {
    thread_id: threadId,
    thread_title: threadTitle,
    speaker: 'adam',
    council_member: 'C2',
    mode,
    domain,
    transcript: text,
    response_text: null,
    message_type: 'user_message',
    transport,
    status: 'received',
    selected_voice: selectedVoice,
    playback_rate: playbackRate,
    explicit_send: explicitSend,
    evidence_json: {
      evidence_status: 'VERIFIED',
      proof_source: 'command_center_operator_input',
      advisory_only: false,
      committed: false,
      do_not_use_for_builderos_memory_proof: true,
      commands_or_endpoints_used: ['POST /api/v1/lifeos/command-center/communications/send'],
    },
  });

  // Inject prior thread messages as context when continuing an existing thread.
  // Skip for c2_command — builder needs unambiguous single-shot instructions.
  const isExistingThread = Boolean(normalizeText(payload.thread_id));
  let contextBlock = '';
  let contextMessageCount = 0;
  if (isExistingThread && mode !== 'c2_command') {
    const priorMessages = await getRecentThreadContext(pool, threadId, userMessage.id);
    contextBlock = buildThreadContextBlock(priorMessages);
    contextMessageCount = priorMessages.length;
  }

  const instruction = contextBlock + buildCommunicationPrompt(mode, text);
  const job = await createCommandControlJob(pool, {
    instruction,
    requested_by: 'adam_remote_c2_communication',
    metadata_json: {
      domain,
      source: 'command_center_communication',
      communication_thread_id: threadId,
      communication_message_id: userMessage.id,
      communication_mode: mode,
      target_file: payload.target_file || null,
      thread_context_count: contextMessageCount,
    },
  });

  // Build system_message immediately — execution runs async so HTTP response never blocks on council.
  const endpointsUsed = [
    'POST /api/v1/lifeos/command-center/communications/send',
    'POST /api/v1/lifeos/builderos/command-control/jobs',
  ];
  const willExecute = job.status === 'queued' && payload.auto_execute !== false;
  if (willExecute) {
    endpointsUsed.push('POST /api/v1/lifeos/builderos/command-control/jobs/:id/execute');
    endpointsUsed.push('GET /api/v1/lifeos/builderos/command-control/jobs/:id');
  }

  const responseText = summarizeExecution({}, job);
  const builderMeta = buildBuilderMetaFromJob(job, deploySha);
  const evidence = buildCommunicationEvidence({ responseText, endpointsUsed, builderMeta, deploySha });

  const systemMessage = await insertCommunication(pool, {
    thread_id: threadId,
    thread_title: threadTitle,
    speaker: 'system',
    council_member: 'C2',
    mode,
    domain,
    transcript: text,
    response_text: responseText,
    message_type: 'system_response',
    transport: 'text',
    status: job.status || 'queued',
    selected_voice: selectedVoice,
    playback_rate: playbackRate,
    explicit_send: true,
    parent_message_id: userMessage.id,
    command_control_job_id: job.id,
    builder_job_id: job.id,
    commit_sha: evidence.commit_sha,
    railway_sha: evidence.railway_sha,
    evidence_json: evidence,
  });

  // Fire execution in background — never blocks the HTTP response.
  if (willExecute) {
    setImmediate(async () => {
      try {
        await executeCommandControlJob(pool, job.id, {
          baseUrl: options.baseUrl,
          commandKey: options.commandKey,
        });
        const refreshedJob = await getCommandControlJob(pool, job.id);
        const updatedText = summarizeExecution(refreshedJob?.result_json?.trace || {}, refreshedJob);
        const updatedMeta = buildBuilderMetaFromJob(refreshedJob, deploySha);
        const updatedEvidence = buildCommunicationEvidence({
          responseText: updatedText,
          endpointsUsed,
          builderMeta: updatedMeta,
          deploySha,
        });
        await updateCommunicationAfterExecution(pool, systemMessage.id, {
          response_text: updatedText,
          status: refreshedJob.status || 'recorded',
          evidence_json: updatedEvidence,
          commit_sha: updatedEvidence.commit_sha,
          railway_sha: updatedEvidence.railway_sha,
          builder_job_id: refreshedJob.id,
        });
      } catch (err) {
        console.error('[C2-comm] async execute failed for job', job.id, err?.message);
        // Recover: mark job failed + update comm row so neither stays zombied.
        try {
          await pool.query(
            `UPDATE builderos_command_control_jobs SET status='failed', blocker=$2, updated_at=NOW() WHERE id=$1 AND status='running'`,
            [job.id, `SETIMMEDIATE_ERROR: ${err?.message || 'unknown'}`],
          );
          await updateCommunicationAfterExecution(pool, systemMessage.id, {
            response_text: `C2 execution interrupted: ${err?.message || 'unknown'}`,
            status: 'failed',
            evidence_json: evidence,
            commit_sha: null,
            railway_sha: null,
            builder_job_id: job.id,
          });
        } catch (recoveryErr) {
          console.error('[C2-comm] recovery update failed for job', job.id, recoveryErr?.message);
        }
      }
    });
  }

  return {
    ok: true,
    thread_id: threadId,
    user_message: userMessage,
    system_message: systemMessage,
    job,
    execution: null,
    evidence,
    async_execute: willExecute,
    thread_context_count: contextMessageCount,
    poll: {
      communications: `/api/v1/lifeos/command-center/communications?thread_id=${threadId}`,
      job_status: `/api/v1/lifeos/builderos/command-control/jobs/${job.id}`,
    },
  };
}
