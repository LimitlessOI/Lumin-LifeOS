/**
 * SYNOPSIS: Go Vegas outreach — discover LV businesses, invite to free network, follow up.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import crypto from 'node:crypto';
import {
  getGoVegasConfig,
  buildInviteEmail,
  buildFollowUpEmail,
  evaluateSendQuota,
  GO_VEGAS_BUSINESS_TYPES,
  GO_VEGAS_DEFAULT_CITY,
  GO_VEGAS_CAMPAIGN_ID,
  GO_VEGAS_FOLLOW_UP_DAYS,
} from '../config/go-vegas-campaign.js';
import { findEmailOnWebsite } from './go-vegas-email-finder.js';
import logger from './logger.js';

function createProspectId() {
  return `gv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchPlaceDetails(placeId, apiKey) {
  const fields = encodeURIComponent('name,website,formatted_phone_number,formatted_address,url');
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;
  const json = await fetchJson(url);
  return json.result || null;
}

async function searchGooglePlaces({ city, type, count, apiKey }) {
  const query = encodeURIComponent(`${type} in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
  const json = await fetchJson(url);
  if (json.status === 'REQUEST_DENIED') {
    return { ok: false, error: json.error_message || 'Google Places request denied', places: [] };
  }
  const results = (json.results || []).slice(0, count);
  const places = [];
  for (const place of results) {
    let details = null;
    if (place.place_id) {
      try {
        details = await fetchPlaceDetails(place.place_id, apiKey);
      } catch {
        /* continue with text search fields */
      }
    }
    places.push({
      businessName: details?.name || place.name,
      businessType: type,
      website: details?.website || null,
      address: details?.formatted_address || place.formatted_address || null,
      phone: details?.formatted_phone_number || null,
      googlePlaceId: place.place_id || null,
      rating: place.rating || null,
      source: 'google_places',
    });
  }
  return { ok: true, places };
}

export function createGoVegasOutreach({ pool, sendEmail, logger: log = logger } = {}) {
  const cfg = () => getGoVegasConfig();

  async function ensureSchema() {
    if (!pool) return { ok: false, error: 'pool required' };
    await pool.query(`
      CREATE TABLE IF NOT EXISTS go_vegas_prospects (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        business_type TEXT,
        website TEXT,
        address TEXT,
        phone TEXT,
        contact_email TEXT,
        contact_name TEXT,
        google_place_id TEXT,
        status TEXT DEFAULT 'discovered',
        follow_up_count INTEGER DEFAULT 0,
        last_contacted_at TIMESTAMPTZ,
        last_follow_up_at TIMESTAMPTZ,
        joined_at TIMESTAMPTZ,
        replied_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    return { ok: true };
  }

  async function getTodaySendUsage() {
    const config = cfg();
    const tz = config.sendLimits.timezone;
    try {
      const { rows } = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE metadata->>'kind' = 'invite')::int AS invites,
           COUNT(*) FILTER (WHERE metadata->>'kind' = 'follow_up')::int AS follow_ups,
           COUNT(*)::int AS total
         FROM outreach_log
         WHERE campaign_id = $1
           AND status = 'sent'
           AND (sent_at AT TIME ZONE $2)::date = (NOW() AT TIME ZONE $2)::date`,
        [GO_VEGAS_CAMPAIGN_ID, tz]
      );
      return {
        invites: rows[0]?.invites || 0,
        followUps: rows[0]?.follow_ups || 0,
        total: rows[0]?.total || 0,
      };
    } catch {
      const { rows } = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'invited' AND last_contacted_at >= date_trunc('day', NOW()))::int AS invites,
           COUNT(*) FILTER (WHERE status LIKE 'follow_up_%' AND last_contacted_at >= date_trunc('day', NOW()))::int AS follow_ups,
           COUNT(*) FILTER (WHERE last_contacted_at >= date_trunc('day', NOW()))::int AS total
         FROM go_vegas_prospects`
      );
      return {
        invites: rows[0]?.invites || 0,
        followUps: rows[0]?.follow_ups || 0,
        total: rows[0]?.total || 0,
      };
    }
  }

  async function getSendQuota() {
    const config = cfg();
    const usage = await getTodaySendUsage();
    return evaluateSendQuota(usage, config.sendLimits);
  }

  async function assertCanSend(kind) {
    const quota = await getSendQuota();
    if (kind === 'invite' && !quota.canSendInvite) {
      return {
        ok: false,
        error: 'daily invite limit reached — protecting your email reputation',
        quota,
      };
    }
    if (kind === 'follow_up' && !quota.canSendFollowUp) {
      return {
        ok: false,
        error: 'daily follow-up limit reached — protecting your email reputation',
        quota,
      };
    }
    return { ok: true, quota };
  }

  async function deliverEmail({ to, subject, html, text, kind, prospectId }) {
    const config = cfg();
    return sendEmail({
      to,
      subject,
      html,
      text,
      from: config.fromEmail,
      replyTo: config.replyTo,
      metadata: { kind, prospectId, fromAddress: config.fromAddress },
      campaignId: GO_VEGAS_CAMPAIGN_ID,
    });
  }

  async function isSuppressed(email) {
    if (!pool || !email) return false;
    try {
      const { rows } = await pool.query(
        `SELECT 1 FROM email_suppressions WHERE lower(email) = lower($1) AND COALESCE(suppressed, true) = true LIMIT 1`,
        [email]
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  async function upsertProspect(row) {
    const id = row.id || createProspectId();
    await pool.query(
      `INSERT INTO go_vegas_prospects
        (id, business_name, business_type, website, address, phone, contact_email, contact_name,
         google_place_id, status, metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW(),NOW())
       ON CONFLICT (id) DO UPDATE SET
         business_name = EXCLUDED.business_name,
         business_type = COALESCE(EXCLUDED.business_type, go_vegas_prospects.business_type),
         website = COALESCE(EXCLUDED.website, go_vegas_prospects.website),
         address = COALESCE(EXCLUDED.address, go_vegas_prospects.address),
         phone = COALESCE(EXCLUDED.phone, go_vegas_prospects.phone),
         contact_email = COALESCE(EXCLUDED.contact_email, go_vegas_prospects.contact_email),
         contact_name = COALESCE(EXCLUDED.contact_name, go_vegas_prospects.contact_name),
         status = COALESCE(EXCLUDED.status, go_vegas_prospects.status),
         metadata = COALESCE(go_vegas_prospects.metadata, '{}'::jsonb) || EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        id,
        row.businessName,
        row.businessType || null,
        row.website || null,
        row.address || null,
        row.phone || null,
        row.contactEmail || null,
        row.contactName || null,
        row.googlePlaceId || null,
        row.status || 'discovered',
        JSON.stringify(row.metadata || {}),
      ]
    );
    return id;
  }

  async function discoverBusinesses({
    city = GO_VEGAS_DEFAULT_CITY,
    type = 'restaurant',
    count = 10,
    enrichEmail = false,
  } = {}) {
    const config = cfg();
    const apiKey = process.env.GOOGLE_PLACES_KEY || process.env.GOOGLE_PLACES_API_KEY;
    if (!pool) return { ok: false, error: 'database pool required' };
    await ensureSchema();

    if (!apiKey) {
      return {
        ok: false,
        error: 'GOOGLE_PLACES_KEY not set',
        hint: `Manual: search "${type} in ${city}" on Google Maps / Yelp`,
        supportedTypes: GO_VEGAS_BUSINESS_TYPES,
      };
    }

    const search = await searchGooglePlaces({ city, type, count: Math.min(count, 20), apiKey });
    if (!search.ok) return search;

    const inserted = [];
    const skipped = [];

    for (const place of search.places) {
      if (place.googlePlaceId) {
        const existing = await pool.query(
          `SELECT id FROM go_vegas_prospects WHERE google_place_id = $1 LIMIT 1`,
          [place.googlePlaceId]
        );
        if (existing.rows[0]) {
          skipped.push({ businessName: place.businessName, reason: 'duplicate' });
          continue;
        }
      }

      let contactEmail = null;
      let emailMeta = {};
      if (enrichEmail && place.website) {
        const found = await findEmailOnWebsite(place.website, { businessName: place.businessName });
        contactEmail = found.email;
        emailMeta = { emailLookup: found };
      }

      const id = await upsertProspect({
        businessName: place.businessName,
        businessType: place.businessType,
        website: place.website,
        address: place.address,
        phone: place.phone,
        contactEmail,
        googlePlaceId: place.googlePlaceId,
        status: contactEmail ? 'ready' : (place.website ? 'discovered' : 'no_website'),
        metadata: { rating: place.rating, city, ...emailMeta },
      });

      inserted.push({ id, ...place, contactEmail, status: contactEmail ? 'ready' : 'discovered' });
    }

    return {
      ok: true,
      city,
      type,
      discovered: inserted.length,
      skipped: skipped.length,
      prospects: inserted,
      config: { facebookGroupReady: Boolean(config.facebookGroupUrl) },
    };
  }

  async function enrichProspects({ limit = 20 } = {}) {
    if (!pool) return { ok: false, error: 'pool required' };
    await ensureSchema();

    const { rows } = await pool.query(
      `SELECT * FROM go_vegas_prospects
        WHERE contact_email IS NULL
          AND website IS NOT NULL
          AND status IN ('discovered', 'no_email')
        ORDER BY created_at ASC
        LIMIT $1`,
      [Math.min(limit, 50)]
    );

    const results = [];
    for (const row of rows) {
      const found = await findEmailOnWebsite(row.website, { businessName: row.business_name });
      if (found.email) {
        await pool.query(
          `UPDATE go_vegas_prospects
              SET contact_email = $2,
                  status = 'ready',
                  metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
                  updated_at = NOW()
            WHERE id = $1`,
          [row.id, found.email, JSON.stringify({ emailLookup: found })]
        );
        results.push({ id: row.id, businessName: row.business_name, email: found.email, ok: true });
      } else {
        await pool.query(
          `UPDATE go_vegas_prospects SET status = 'no_email', updated_at = NOW() WHERE id = $1`,
          [row.id]
        );
        results.push({ id: row.id, businessName: row.business_name, ok: false, error: found.error });
      }
    }

    return { ok: true, enriched: results.filter((r) => r.ok).length, results };
  }

  async function sendInvite(prospectId, { dryRun = false } = {}) {
    const config = cfg();
    if (!config.ready) {
      return { ok: false, error: 'campaign not configured', blockers: config.blockers };
    }
    if (!sendEmail && !dryRun) return { ok: false, error: 'sendEmail not configured' };

    const { rows } = await pool.query(`SELECT * FROM go_vegas_prospects WHERE id = $1`, [prospectId]);
    const row = rows[0];
    if (!row) return { ok: false, error: 'prospect not found' };
    if (!row.contact_email) return { ok: false, error: 'contact_email missing — run enrich first' };
    if (['joined', 'opted_out', 'bounced'].includes(row.status)) {
      return { ok: false, error: `status ${row.status} is not invitable` };
    }
    if (await isSuppressed(row.contact_email)) {
      return { ok: false, error: 'email suppressed' };
    }

    const emailContent = buildInviteEmail({
      businessName: row.business_name,
      contactName: row.contact_name,
      config,
    });

    if (dryRun) {
      const quota = await getSendQuota();
      return { ok: true, dryRun: true, prospectId, from: config.fromEmail, quota, ...emailContent };
    }

    const gate = await assertCanSend('invite');
    if (!gate.ok) return gate;

    const delivery = await deliverEmail({
      to: row.contact_email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      kind: 'invite',
      prospectId,
    });
    if (delivery?.success === false) {
      return { ok: false, error: delivery.error || 'send failed' };
    }

    await pool.query(
      `UPDATE go_vegas_prospects
          SET status = 'invited',
              last_contacted_at = NOW(),
              metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
        WHERE id = $1`,
      [prospectId, JSON.stringify({ lastInviteAt: new Date().toISOString(), campaignId: GO_VEGAS_CAMPAIGN_ID })]
    );

    log.info?.('[GO-VEGAS] Invite sent', { prospectId, business: row.business_name, email: row.contact_email });
    return { ok: true, prospectId, businessName: row.business_name, email: row.contact_email };
  }

  async function sendFollowUp(prospectId, followUpNumber, { dryRun = false } = {}) {
    const config = cfg();
    if (!config.ready) return { ok: false, error: 'campaign not configured', blockers: config.blockers };
    if (!sendEmail && !dryRun) return { ok: false, error: 'sendEmail not configured' };

    const { rows } = await pool.query(`SELECT * FROM go_vegas_prospects WHERE id = $1`, [prospectId]);
    const row = rows[0];
    if (!row?.contact_email) return { ok: false, error: 'prospect or email missing' };
    if (['joined', 'opted_out', 'bounced', 'replied'].includes(row.status)) {
      return { ok: false, error: `status ${row.status} not follow-up eligible` };
    }
    if (await isSuppressed(row.contact_email)) return { ok: false, error: 'email suppressed' };

    const num = Math.min(3, Math.max(1, Number(followUpNumber) || 1));
    const emailContent = buildFollowUpEmail({
      businessName: row.business_name,
      contactName: row.contact_name,
      followUpNumber: num,
      config,
    });

    if (dryRun) {
      const quota = await getSendQuota();
      return { ok: true, dryRun: true, prospectId, followUpNumber: num, from: config.fromEmail, quota, ...emailContent };
    }

    const gate = await assertCanSend('follow_up');
    if (!gate.ok) return gate;

    const delivery = await deliverEmail({
      to: row.contact_email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      kind: 'follow_up',
      prospectId,
    });
    if (delivery?.success === false) return { ok: false, error: delivery.error || 'send failed' };

    await pool.query(
      `UPDATE go_vegas_prospects
          SET status = $2,
              follow_up_count = COALESCE(follow_up_count, 0) + 1,
              last_follow_up_at = NOW(),
              last_contacted_at = NOW(),
              updated_at = NOW()
        WHERE id = $1`,
      [prospectId, `follow_up_${num}`]
    );

    return { ok: true, prospectId, followUpNumber: num, email: row.contact_email };
  }

  async function inviteBatch({ limit = 10, dryRun = false } = {}) {
    await ensureSchema();
    const quota = await getSendQuota();
    const batchLimit = dryRun
      ? Math.min(limit, 30)
      : Math.min(limit, quota.remaining.invites, quota.remaining.total, 30);

    const { rows } = await pool.query(
      `SELECT id FROM go_vegas_prospects
        WHERE contact_email IS NOT NULL
          AND status = 'ready'
        ORDER BY created_at ASC
        LIMIT $1`,
      [Math.max(0, batchLimit)]
    );

    const outcomes = [];
    for (const row of rows) {
      const result = await sendInvite(row.id, { dryRun });
      outcomes.push(result);
      if (!dryRun && result.ok === false && result.error?.includes('daily invite limit')) break;
    }

    return {
      ok: true,
      attempted: outcomes.length,
      sent: outcomes.filter((o) => o.ok && !o.dryRun).length,
      quota: await getSendQuota(),
      outcomes,
    };
  }

  async function runFollowUpCron({ dryRun = false } = {}) {
    await ensureSchema();
    const now = Date.now();
    const { rows } = await pool.query(
      `SELECT * FROM go_vegas_prospects
        WHERE contact_email IS NOT NULL
          AND status IN ('invited', 'follow_up_1', 'follow_up_2')
          AND COALESCE(follow_up_count, 0) < 3
        ORDER BY last_contacted_at ASC NULLS FIRST
        LIMIT 100`
    );

    const outcomes = [];
    for (const row of rows) {
      const count = Number(row.follow_up_count || 0);
      const nextFollowUp = count + 1;
      const dayThreshold = GO_VEGAS_FOLLOW_UP_DAYS[count];
      if (dayThreshold == null) continue;

      const anchor = row.last_contacted_at || row.created_at;
      if (!anchor) continue;
      const daysSince = (now - new Date(anchor).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < dayThreshold) continue;

      const result = await sendFollowUp(row.id, nextFollowUp, { dryRun });
      outcomes.push(result);
      if (!dryRun && result.ok === false && result.error?.includes('daily follow-up limit')) break;
    }

    return {
      ok: true,
      eligible: rows.length,
      sent: outcomes.filter((o) => o.ok && !o.dryRun).length,
      quota: await getSendQuota(),
      outcomes,
    };
  }

  async function updateProspectStatus(prospectId, { status, note = null } = {}) {
    const allowed = ['discovered', 'ready', 'invited', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'replied', 'joined', 'opted_out', 'bounced', 'no_email', 'no_website'];
    if (!allowed.includes(status)) return { ok: false, error: `invalid status: ${status}` };

    const patch = { statusNote: note, statusUpdatedAt: new Date().toISOString() };
    const joinedAt = status === 'joined' ? new Date() : null;
    const repliedAt = status === 'replied' ? new Date() : null;

    await pool.query(
      `UPDATE go_vegas_prospects
          SET status = $2,
              joined_at = COALESCE($3, joined_at),
              replied_at = COALESCE($4, replied_at),
              metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,
              updated_at = NOW()
        WHERE id = $1`,
      [prospectId, status, joinedAt, repliedAt, JSON.stringify(patch)]
    );
    return { ok: true, prospectId, status };
  }

  async function getPipelineStats() {
    await ensureSchema();
    const config = cfg();
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM go_vegas_prospects GROUP BY status ORDER BY count DESC`
    );
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    const quota = await getSendQuota();
    return {
      ok: true,
      campaignId: GO_VEGAS_CAMPAIGN_ID,
      city: GO_VEGAS_DEFAULT_CITY,
      config: {
        ...config,
        sendFrom: config.fromEmail,
        sendLimits: config.sendLimits,
      },
      sendQuota: quota,
      total,
      byStatus: rows,
      supportedTypes: GO_VEGAS_BUSINESS_TYPES,
    };
  }

  async function listProspects({ limit = 50, status = null } = {}) {
    await ensureSchema();
    const params = [Math.min(limit, 200)];
    let sql = `SELECT id, business_name, business_type, website, contact_email, status, follow_up_count, last_contacted_at, joined_at, created_at
               FROM go_vegas_prospects`;
    if (status) {
      sql += ` WHERE status = $2`;
      params.push(status);
    }
    sql += ` ORDER BY updated_at DESC LIMIT $1`;
    const { rows } = await pool.query(sql, params);
    return { ok: true, prospects: rows };
  }

  return {
    ensureSchema,
    upsertProspect,
    discoverBusinesses,
    enrichProspects,
    sendInvite,
    sendFollowUp,
    inviteBatch,
    runFollowUpCron,
    updateProspectStatus,
    getPipelineStats,
    listProspects,
    getSendQuota,
    getGoVegasConfig: cfg,
  };
}

export default createGoVegasOutreach;
