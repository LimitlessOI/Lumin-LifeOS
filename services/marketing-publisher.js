// SYNOPSIS: Publish an approved MarketingOS content piece via browser-agent replay/explore.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { getConnection } from './marketing-social-connections.js';
import { buildPublishGoal } from './marketing-social-goals.js';
import { applyConnectionCookies } from './marketing-social-connect-session.js';
import { runGoalOnSession } from './general-browser-agent-live.js';
import { executeAction, makeEvidenceVerifier, observePage } from './general-browser-agent-runtime.js';

async function getExistingTemplate(pool, platform, goalKey) {
  const { rows } = await pool.query(
    `SELECT id, platform, goal_key, steps_json, captured_at, last_used_at, last_verified_ok_at, site_version_hint, created_at
     FROM marketing_social_posting_templates
     WHERE platform = $1 AND goal_key = $2
     ORDER BY last_verified_ok_at DESC NULLS LAST, captured_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [platform, goalKey],
  );
  return rows[0] || null;
}

async function upsertTemplate(pool, template, platform, goalKey) {
  if (!template) return null;
  const stepsJson = typeof template.steps_json === 'string'
    ? template.steps_json
    : JSON.stringify(template.steps_json ?? template.steps ?? []);
  const { rows } = await pool.query(
    `INSERT INTO marketing_social_posting_templates
       (platform, goal_key, steps_json, captured_at, last_used_at, last_verified_ok_at, site_version_hint)
     VALUES
       ($1, $2, $3::jsonb, NOW(), NOW(), NOW(), $4)
     ON CONFLICT (platform, goal_key)
     DO UPDATE SET
       steps_json = EXCLUDED.steps_json,
       captured_at = EXCLUDED.captured_at,
       last_used_at = EXCLUDED.last_used_at,
       last_verified_ok_at = EXCLUDED.last_verified_ok_at,
       site_version_hint = EXCLUDED.site_version_hint
     RETURNING id, platform, goal_key, steps_json, captured_at, last_used_at, last_verified_ok_at, site_version_hint, created_at`,
    [platform, goalKey, stepsJson, template.siteVersionHint || null],
  );
  return rows[0] || null;
}

async function insertPublishRecord(pool, pieceId, platform, status, publisherService, platformPostId, errorDetail) {
  await pool.query(
    `INSERT INTO marketing_publish_records
       (piece_id, platform, platform_post_id, published_at, status, publisher_service, error_detail)
     VALUES
       ($1, $2, $3, CASE WHEN $4 = 'published' THEN NOW() ELSE NULL END, $4, $5, $6)`,
    [pieceId, platform, platformPostId || null, status, publisherService, errorDetail || null],
  );
}

function unwrapConnection(got) {
  if (!got) return null;
  if (got.ok === false) return null;
  if (got.connection) return got.connection;
  if (got.status || got.sessionState) return got;
  return null;
}

export async function publishApprovedPiece({ pool, piece, session, callModel }) {
  try {
    if (!piece || piece.status !== 'approved') {
      return { ok: false, reason: 'not_approved' };
    }

    const connection = unwrapConnection(
      await getConnection(pool, { ownerId: piece.owner_id, platform: piece.platform }),
    );
    if (!connection || connection.status !== 'connected') {
      return { ok: false, reason: 'not_connected' };
    }

    if (process.env.LIVE_SOCIAL_PUBLISH_ENABLED !== 'true') {
      return {
        ok: false,
        reason: 'live_publish_disabled',
        dryRun: true,
        ready: true,
        platform: piece.platform,
        hint: 'Account is connected. Set LIVE_SOCIAL_PUBLISH_ENABLED=true on Railway to post for real.',
      };
    }

    if (!session) {
      return { ok: false, reason: 'browser_session_unavailable' };
    }

    await applyConnectionCookies(session, connection.sessionState);

    const goal = buildPublishGoal({ platform: piece.platform, contentText: piece.content_text });
    const templateRow = await getExistingTemplate(pool, piece.platform, goal.goalKey);

    let outcome = null;
    let usedReplay = false;
    let publishRecordStatus = 'failed';
    let platformPostId = null;
    let errorDetail = null;

    if (templateRow?.steps_json) {
      usedReplay = true;
      const steps = typeof templateRow.steps_json === 'string'
        ? JSON.parse(templateRow.steps_json)
        : templateRow.steps_json;
      for (const step of Array.isArray(steps) ? steps : []) {
        await executeAction(session, step);
      }

      const verify = makeEvidenceVerifier({ mustContain: goal.mustContain });
      const evidence = await observePage(session);
      const verified = verify(evidence);

      if (verified) {
        publishRecordStatus = 'published';
        platformPostId = evidence?.postId || evidence?.platformPostId || null;
        outcome = {
          ok: true,
          reached: true,
          path: 'replay',
          templateUsed: true,
        };
      } else {
        errorDetail = 'replay_evidence_check_failed';
      }
    }

    if (!outcome) {
      const live = await runGoalOnSession({
        session,
        goal: goal.goal,
        startUrl: goal.startUrl,
        callModel,
        mustContain: goal.mustContain,
        expectSiteHost: goal.expectSiteHost,
      });

      if (live?.ok && live?.reached) {
        publishRecordStatus = 'published';
        platformPostId = live.platformPostId || live.postId || null;
        outcome = {
          ok: true,
          reached: true,
          path: usedReplay ? 'fallback' : 'explore',
          templateUsed: false,
        };
        await upsertTemplate(pool, live.template, piece.platform, goal.goalKey);
      } else {
        publishRecordStatus = live?.needsHuman ? 'needs_human' : 'failed';
        errorDetail = live?.error || live?.reason || errorDetail || 'publish_failed';
        outcome = {
          ok: false,
          reason: live?.reason || 'publish_failed',
          needsHuman: Boolean(live?.needsHuman),
        };
      }
    }

    await insertPublishRecord(
      pool,
      piece.id,
      piece.platform,
      publishRecordStatus,
      'general-browser-agent',
      platformPostId,
      errorDetail,
    );

    return outcome;
  } catch (error) {
    try {
      if (pool && piece?.id && piece?.platform) {
        await insertPublishRecord(
          pool,
          piece.id,
          piece.platform,
          'failed',
          'general-browser-agent',
          null,
          error?.message || String(error),
        );
      }
    } catch { /* non-fatal */ }
    return { ok: false, error: error?.message || String(error) };
  }
}

export default publishApprovedPiece;