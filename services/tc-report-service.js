/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * tc-report-service.js
 * Showings, feedback, health scoring, and weekly seller/agent reports.
 */

function weekBounds(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const day = date.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - diffToMonday));
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function classifySentiment(text = '', rating = null) {
  const lower = String(text || '').toLowerCase();
  if (rating !== null) {
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
  }
  if (/too high|overpriced|small|dated|busy street|needs work|dark|poor condition/.test(lower)) return 'negative';
  if (/great|beautiful|shows well|love|liked|amazing|priced right/.test(lower)) return 'positive';
  if (/but|however|mixed/.test(lower)) return 'mixed';
  return 'neutral';
}

function summarizeFeedbackThemes(feedbackRows = []) {
  const buckets = {
    pricing: 0,
    condition: 0,
    layout: 0,
    positive: 0,
    neutral: 0,
  };
  for (const item of feedbackRows) {
    const text = `${item.raw_feedback || ''} ${item.price_feedback || ''} ${item.condition_feedback || ''} ${item.competition_feedback || ''}`.toLowerCase();
    if (/price|overpriced|too high|reduce/.test(text)) buckets.pricing += 1;
    if (/condition|paint|floor|dated|repair|clean/.test(text)) buckets.condition += 1;
    if (/layout|floorplan|space|small|bedroom|bathroom/.test(text)) buckets.layout += 1;
    if ((item.sentiment || '').toLowerCase() === 'positive') buckets.positive += 1;
    if ((item.sentiment || '').toLowerCase() === 'neutral') buckets.neutral += 1;
  }
  return buckets;
}

function healthStatusFromScore(score) {
  if (score >= 80) return 'healthy';
  if (score >= 55) return 'watch';
  return 'at_risk';
}

export function createTCReportService({ pool, coordinator, logger = console }) {
  async function listShowings(transactionId) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_showings WHERE transaction_id=$1 ORDER BY showing_at DESC`,
      [transactionId]
    );
    return rows;
  }

  async function createShowing(transactionId, payload = {}) {
    const {
      showing_at,
      status = 'scheduled',
      showing_agent_name = null,
      showing_agent_email = null,
      showing_agent_phone = null,
      source = 'manual',
      notes = null,
      metadata = {},
    } = payload;
    const { rows } = await pool.query(
      `INSERT INTO tc_showings (transaction_id, showing_at, status, showing_agent_name, showing_agent_email, showing_agent_phone, source, notes, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [transactionId, showing_at, status, showing_agent_name, showing_agent_email, showing_agent_phone, source, notes, JSON.stringify(metadata || {})]
    );
    const row = rows[0];
    await coordinator.logEvent(transactionId, 'showing_recorded', { showing_id: row.id, status: row.status, showing_at: row.showing_at });
    return row;
  }

  async function updateShowing(showingId, patch = {}) {
    const fields = [];
    const values = [];
    const allowed = ['showing_at', 'status', 'showing_agent_name', 'showing_agent_email', 'showing_agent_phone', 'source', 'notes', 'metadata'];
    for (const key of allowed) {
      if (key in patch) {
        values.push(key === 'metadata' ? JSON.stringify(patch[key] || {}) : patch[key]);
        fields.push(`${key}=$${values.length}`);
      }
    }
    if (!fields.length) return null;
    values.push(showingId);
    const { rows } = await pool.query(
      `UPDATE tc_showings SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`,
      values
    );
    const row = rows[0] || null;
    if (row) await coordinator.logEvent(row.transaction_id, 'showing_updated', { showing_id: row.id, status: row.status });
    return row;
  }

  async function recordShowingFeedback(showingId, payload = {}) {
    const { rows: showingRows } = await pool.query(`SELECT * FROM tc_showings WHERE id=$1`, [showingId]);
    const showing = showingRows[0];
    if (!showing) return null;

    const {
      sentiment = null,
      rating = null,
      price_feedback = null,
      condition_feedback = null,
      competition_feedback = null,
      raw_feedback,
      source = 'manual',
    } = payload;

    const normalizedSentiment = sentiment || classifySentiment(raw_feedback, rating);
    const { rows } = await pool.query(
      `INSERT INTO tc_showing_feedback (showing_id, transaction_id, sentiment, rating, price_feedback, condition_feedback, competition_feedback, raw_feedback, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [showingId, showing.transaction_id, normalizedSentiment, rating, price_feedback, condition_feedback, competition_feedback, raw_feedback, source]
    );
    const feedback = rows[0];
    await coordinator.logEvent(showing.transaction_id, 'showing_feedback_recorded', { showing_id: showingId, feedback_id: feedback.id, sentiment: feedback.sentiment });
    return feedback;
  }

  async function listShowingFeedback(transactionId) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_showing_feedback WHERE transaction_id=$1 ORDER BY created_at DESC`,
      [transactionId]
    );
    return rows;
  }

  async function createMarketSnapshot(transactionId, payload = {}) {
    const {
      snapshot_date = new Date().toISOString().slice(0, 10),
      active_comp_count = 0,
      pending_comp_count = 0,
      sold_comp_count = 0,
      price_reduction_count = 0,
      avg_dom = null,
      median_list_price = null,
      median_sold_price = null,
      view_count = null,
      save_count = null,
      inquiry_count = null,
      metadata = {},
    } = payload;

    const { rows } = await pool.query(
      `INSERT INTO tc_market_snapshots (transaction_id, snapshot_date, active_comp_count, pending_comp_count, sold_comp_count, price_reduction_count, avg_dom, median_list_price, median_sold_price, view_count, save_count, inquiry_count, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [transactionId, snapshot_date, active_comp_count, pending_comp_count, sold_comp_count, price_reduction_count, avg_dom, median_list_price, median_sold_price, view_count, save_count, inquiry_count, JSON.stringify(metadata || {})]
    );
    await coordinator.logEvent(transactionId, 'market_snapshot_recorded', { snapshot_date, active_comp_count, pending_comp_count, sold_comp_count });
    return rows[0];
  }

  async function getLatestMarketSnapshot(transactionId) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_market_snapshots WHERE transaction_id=$1 ORDER BY snapshot_date DESC, created_at DESC LIMIT 1`,
      [transactionId]
    );
    return rows[0] || null;
  }

  function computeHealth({ showings, feedback, marketSnapshot }) {
    let score = 70;
    const completedShowings = showings.filter((item) => item.status === 'completed').length;
    score += Math.min(completedShowings * 3, 15);

    const negativeFeedback = feedback.filter((item) => item.sentiment === 'negative').length;
    const positiveFeedback = feedback.filter((item) => item.sentiment === 'positive').length;
    score += positiveFeedback * 4;
    score -= negativeFeedback * 6;

    if (marketSnapshot) {
      if ((marketSnapshot.price_reduction_count || 0) >= 2) score -= 8;
      if ((marketSnapshot.avg_dom || 0) > 45) score -= 6;
      if ((marketSnapshot.pending_comp_count || 0) >= 2) score += 5;
      if ((marketSnapshot.inquiry_count || 0) >= 3) score += 4;
      if ((marketSnapshot.save_count || 0) >= 5) score += 4;
    }

    score = Math.max(0, Math.min(100, score));
    return { score, health_status: healthStatusFromScore(score) };
  }

  function buildRecommendations({ health_status, themes, marketSnapshot }) {
    const recs = [];
    if (themes.pricing >= 2) recs.push('Review price positioning against current competition.');
    if (themes.condition >= 2) recs.push('Address condition/presentation comments before the next showing cycle.');
    if (themes.layout >= 2) recs.push('Adjust marketing to pre-handle layout objections and set expectations earlier.');
    if (health_status === 'at_risk') recs.push('Escalate to agent review and prepare a seller update with specific corrective options.');
    if (marketSnapshot && (marketSnapshot.pending_comp_count || 0) > 0 && recs.length === 0) {
      recs.push('Maintain current positioning but keep weekly communication proactive as nearby properties move.');
    }
    if (!recs.length) recs.push('Maintain current strategy and continue collecting showing feedback.');
    return recs;
  }

  async function generateWeeklyReport(transactionId, { audience = 'seller', referenceDate = new Date() } = {}) {
    const transaction = await coordinator.getTransaction(transactionId);
    if (!transaction) return null;

    const bounds = weekBounds(referenceDate);
    const [showings, feedback, marketSnapshot] = await Promise.all([
      listShowings(transactionId),
      listShowingFeedback(transactionId),
      getLatestMarketSnapshot(transactionId),
    ]);

    const inWindowShowings = showings.filter((item) => String(item.showing_at).slice(0, 10) >= bounds.start && String(item.showing_at).slice(0, 10) <= bounds.end);
    const inWindowFeedback = feedback.filter((item) => String(item.created_at).slice(0, 10) >= bounds.start && String(item.created_at).slice(0, 10) <= bounds.end);
    const themes = summarizeFeedbackThemes(inWindowFeedback);
    const health = computeHealth({ showings: inWindowShowings, feedback: inWindowFeedback, marketSnapshot });
    const recommendations = buildRecommendations({ health_status: health.health_status, themes, marketSnapshot });

    const metrics = {
      showings_completed: inWindowShowings.filter((item) => item.status === 'completed').length,
      showings_scheduled: inWindowShowings.filter((item) => item.status === 'scheduled').length,
      feedback_received: inWindowFeedback.length,
      positive_feedback: inWindowFeedback.filter((item) => item.sentiment === 'positive').length,
      negative_feedback: inWindowFeedback.filter((item) => item.sentiment === 'negative').length,
      active_comp_count: marketSnapshot?.active_comp_count || 0,
      pending_comp_count: marketSnapshot?.pending_comp_count || 0,
      sold_comp_count: marketSnapshot?.sold_comp_count || 0,
      price_reduction_count: marketSnapshot?.price_reduction_count || 0,
      avg_dom: marketSnapshot?.avg_dom || null,
      save_count: marketSnapshot?.save_count || null,
      inquiry_count: marketSnapshot?.inquiry_count || null,
      health_score: health.score,
    };

    const summary = [
      `This week the property logged ${metrics.showings_completed} completed showing(s) and ${metrics.feedback_received} feedback response(s).`,
      marketSnapshot ? `Current market snapshot: ${metrics.active_comp_count} active competing listing(s), ${metrics.pending_comp_count} pending, ${metrics.sold_comp_count} sold.` : 'No market snapshot has been captured yet.',
      `Overall listing health is ${health.health_status.replace('_', ' ')} (${health.score}/100).`,
    ].join(' ');

    const reportPayload = {
      transaction: { id: transaction.id, address: transaction.address },
      period: bounds,
      health,
      metrics,
      themes,
      recommendations,
      market_snapshot: marketSnapshot,
      showings: inWindowShowings,
      feedback: inWindowFeedback,
    };

    const { rows } = await pool.query(
      `INSERT INTO tc_weekly_reports (transaction_id, week_start, week_end, audience, health_status, summary, recommendations, metrics, report_payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [transactionId, bounds.start, bounds.end, audience, health.health_status, summary, JSON.stringify(recommendations), JSON.stringify(metrics), JSON.stringify(reportPayload)]
    );
    const report = rows[0];
    await coordinator.logEvent(transactionId, 'weekly_report_generated', { report_id: report.id, audience, health_status: health.health_status });
    return { report, payload: reportPayload };
  }

  async function listReports(transactionId) {
    const { rows } = await pool.query(
      `SELECT * FROM tc_weekly_reports WHERE transaction_id=$1 ORDER BY week_end DESC, created_at DESC`,
      [transactionId]
    );
    return rows;
  }

  return {
    listShowings,
    createShowing,
    updateShowing,
    recordShowingFeedback,
    listShowingFeedback,
    createMarketSnapshot,
    getLatestMarketSnapshot,
    generateWeeklyReport,
    listReports,
  };
}

export default createTCReportService;
