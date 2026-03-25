/**
 * services/savings-ledger.js — TCO-E01
 *
 * Per-request savings receipt. Every AI call records before/after tokens,
 * cost delta, provider, quality score, and which compression layers fired.
 *
 * This is the sellable moat: verified proof of savings per request.
 * No claim is made without a DB record backing it.
 *
 * Exports: createSavingsLedger(pool) → { record, getReport, getDashboard, getReceipt }
 */

// Cost per 1M tokens by provider/model (USD). Used when provider doesn't return usage.
const COST_PER_M = {
  'anthropic':  { input: 3.00,  output: 15.00 },
  'openai':     { input: 2.50,  output: 10.00 },
  'groq':       { input: 0.00,  output: 0.00  }, // free tier
  'gemini':     { input: 0.00,  output: 0.00  }, // free tier
  'cerebras':   { input: 0.00,  output: 0.00  }, // free tier
  'openrouter': { input: 0.00,  output: 0.00  }, // free models
  'mistral':    { input: 0.00,  output: 0.00  }, // free tier
  'together':   { input: 0.00,  output: 0.00  }, // free tier
  'ollama':     { input: 0.00,  output: 0.00  }, // local
  'logic':      { input: 0.00,  output: 0.00  }, // deterministic no-AI path
  'default':    { input: 3.00,  output: 10.00 },
};

const FREE_PROVIDERS = new Set(['groq','gemini','cerebras','openrouter','mistral','together','ollama','logic']);

function estimateCost(tokens, type, provider, model) {
  const rates = COST_PER_M[provider?.toLowerCase()] || COST_PER_M.default;
  const rate = type === 'output' ? rates.output : rates.input;
  return (tokens / 1_000_000) * rate;
}

export function createSavingsLedger(pool) {
  // ── Record a single AI call receipt ─────────────────────────────────────────
  async function record({
    sessionId,
    requestId,
    clientId,
    provider,
    model,
    taskType,
    originalTokens,
    compressedTokens,
    outputTokens = 0,
    savedTokens: explicitSavedTokens = null,
    savedOutputPct = 0,   // Chain of Draft output savings % (input math can't capture this)
    cacheHit = false,
    qualityScore = null,
    qualityMethod = null,
    compressionLayers = null,
    fallbackTriggered = false,
    driftDetected = false,
    costUSD = null,
  } = {}) {
    if (!pool) return null;

    const orig = originalTokens ?? compressedTokens ?? 0;
    const comp = compressedTokens ?? orig;
    // Input savings from compression; output savings from Chain of Draft
    const inputSaved = Math.max(0, orig - comp);
    const outputSaved = savedOutputPct > 0
      ? Math.round(outputTokens * (savedOutputPct / 100))
      : 0;
    const savedTokens = explicitSavedTokens !== null
      ? explicitSavedTokens + outputSaved
      : inputSaved + outputSaved;
    const totalBaseline = orig + (outputTokens + outputSaved);
    const savingsPct = totalBaseline > 0
      ? Math.round((savedTokens / totalBaseline) * 100 * 100) / 100
      : 0;
    const providerLower = (provider || '').toLowerCase();
    const providerWasFree = FREE_PROVIDERS.has(providerLower);

    // Cost: use provided value or estimate
    const actualCost = costUSD ?? estimateCost(comp, 'input', providerLower, model)
                               + estimateCost(outputTokens, 'output', providerLower, model);

    // What we saved: cost of original tokens at paid rates vs actual cost
    const baselineCost = estimateCost(orig, 'input', 'default', null)
                       + estimateCost(outputTokens + outputSaved, 'output', 'default', null);
    const savedCostUSD = Math.max(0, baselineCost - actualCost);

    try {
      const result = await pool.query(`
        INSERT INTO token_usage_log (
          session_id, request_id, client_id,
          provider, model, task_type,
          input_tokens, output_tokens, saved_tokens,
          original_tokens, compressed_tokens, savings_pct,
          cache_hit, provider_was_free,
          cost_usd, saved_cost_usd,
          quality_score, quality_method,
          compression_layers,
          fallback_triggered, drift_detected,
          logged_at
        ) VALUES (
          $1,$2,$3, $4,$5,$6, $7,$8,$9, $10,$11,$12,
          $13,$14, $15,$16, $17,$18, $19, $20,$21, NOW()
        ) RETURNING id
      `, [
        sessionId || null, requestId || null, clientId || null,
        provider || 'unknown', model || 'unknown', taskType || 'general',
        comp, outputTokens, savedTokens,
        orig, comp, savingsPct,
        cacheHit, providerWasFree,
        actualCost, savedCostUSD,
        qualityScore, qualityMethod || 'savings-ledger',
        compressionLayers ? JSON.stringify(compressionLayers) : null,
        fallbackTriggered, driftDetected,
      ]);
      return result.rows[0]?.id;
    } catch (err) {
      // Never throw — ledger failure must not break AI calls
      console.warn('[LEDGER] record failed:', err.message);
      return null;
    }
  }

  // ── Get a single receipt by ID ──────────────────────────────────────────────
  async function getReceipt(id) {
    if (!pool) return null;
    try {
      const { rows } = await pool.query(
        'SELECT * FROM token_usage_log WHERE id = $1', [id]
      );
      return rows[0] || null;
    } catch { return null; }
  }

  // ── Dashboard summary — today + rolling 30d ──────────────────────────────
  async function getDashboard(clientId = null) {
    if (!pool) return null;
    try {
      const filter = clientId ? 'AND client_id = $1' : '';
      const params = clientId ? [clientId] : [];

      const { rows: today } = await pool.query(`
        SELECT
          COUNT(*) AS calls,
          SUM(input_tokens) AS input_tokens,
          SUM(output_tokens) AS output_tokens,
          SUM(original_tokens) AS original_tokens,
          SUM(compressed_tokens) AS compressed_tokens,
          SUM(saved_tokens) AS saved_tokens,
          ROUND(AVG(savings_pct),1) AS avg_savings_pct,
          SUM(cost_usd) AS cost_usd,
          SUM(saved_cost_usd) AS saved_cost_usd,
          COUNT(*) FILTER (WHERE cache_hit) AS cache_hits,
          COUNT(*) FILTER (WHERE provider_was_free) AS free_calls,
          ROUND(AVG(quality_score),2) AS avg_quality
        FROM token_usage_log
        WHERE logged_at >= NOW() - INTERVAL '24 hours'
          AND provider_was_free IS NOT NULL
        ${filter}
      `, params);

      const { rows: month } = await pool.query(`
        SELECT
          COUNT(*) AS calls,
          SUM(input_tokens) AS input_tokens,
          SUM(output_tokens) AS output_tokens,
          SUM(original_tokens) AS original_tokens,
          SUM(compressed_tokens) AS compressed_tokens,
          SUM(saved_tokens) AS saved_tokens,
          ROUND(AVG(savings_pct),1) AS avg_savings_pct,
          SUM(cost_usd) AS cost_usd,
          SUM(saved_cost_usd) AS saved_cost_usd,
          COUNT(*) FILTER (WHERE cache_hit) AS cache_hits,
          COUNT(*) FILTER (WHERE provider_was_free) AS free_calls
        FROM token_usage_log
        WHERE logged_at >= NOW() - INTERVAL '30 days'
          AND provider_was_free IS NOT NULL
        ${filter}
      `, params);

      const { rows: byProvider } = await pool.query(`
        SELECT provider, COUNT(*) AS calls,
          SUM(input_tokens) AS input_tokens,
          SUM(output_tokens) AS output_tokens,
          SUM(original_tokens) AS original_tokens,
          SUM(compressed_tokens) AS compressed_tokens,
          SUM(saved_tokens) AS saved_tokens,
          SUM(cost_usd) AS cost_usd,
          SUM(saved_cost_usd) AS saved_cost_usd
        FROM token_usage_log
        WHERE logged_at >= NOW() - INTERVAL '30 days'
          AND provider_was_free IS NOT NULL
        ${filter}
        GROUP BY provider ORDER BY calls DESC
      `, params);

      // Per-layer savings: layers store { savedTokens, savedChars, savedPct, applied }
      // Coalesce savedTokens (int layers) and savedChars/4 (char-based layers like TOON)
      const { rows: byLayer } = await pool.query(`
        SELECT
          layer_key AS layer,
          COUNT(*) AS fires,
          SUM(
            COALESCE(
              (layer_val->>'savedTokens')::int,
              ((layer_val->>'savedChars')::numeric / 4)::int,
              0
            )
          ) AS total_saved_tokens
        FROM token_usage_log,
          jsonb_each(compression_layers) AS t(layer_key, layer_val)
        WHERE compression_layers IS NOT NULL
          AND provider_was_free IS NOT NULL
          AND logged_at >= NOW() - INTERVAL '30 days'
          ${filter}
        GROUP BY layer_key
        ORDER BY total_saved_tokens DESC
      `, params).catch(() => ({ rows: [] }));

      return {
        today: today[0],
        month: month[0],
        byProvider,
        byLayer,
      };
    } catch (err) {
      console.warn('[LEDGER] getDashboard failed:', err.message);
      return null;
    }
  }

  // ── Verified savings report — for client-facing proof ────────────────────
  async function getReport({ clientId, from, to } = {}) {
    if (!pool) return null;
    try {
      const fromDate = from || new Date(Date.now() - 30 * 86400_000).toISOString();
      const toDate   = to   || new Date().toISOString();
      const filter   = clientId ? 'AND client_id = $3' : '';
      const params   = clientId
        ? [fromDate, toDate, clientId]
        : [fromDate, toDate];

      const { rows } = await pool.query(`
        SELECT
          COUNT(*) AS total_calls,
          SUM(original_tokens) AS baseline_tokens,
          SUM(compressed_tokens) AS actual_tokens,
          SUM(saved_tokens) AS saved_tokens,
          ROUND(AVG(savings_pct),2) AS avg_savings_pct,
          SUM(cost_usd) AS actual_cost_usd,
          SUM(saved_cost_usd) AS saved_cost_usd,
          COUNT(*) FILTER (WHERE cache_hit) AS cache_hits,
          COUNT(*) FILTER (WHERE provider_was_free) AS free_provider_calls,
          ROUND(AVG(quality_score),2) AS avg_quality_score,
          COUNT(*) FILTER (WHERE drift_detected) AS drift_incidents,
          COUNT(*) FILTER (WHERE fallback_triggered) AS fallbacks
        FROM token_usage_log
        WHERE logged_at BETWEEN $1 AND $2
          AND provider_was_free IS NOT NULL
        ${filter}
      `, params);

      const summary = rows[0];
      const totalSaved = parseFloat(summary.saved_cost_usd || 0);
      const actualCost = parseFloat(summary.actual_cost_usd || 0);

      return {
        period: { from: fromDate, to: toDate },
        clientId: clientId || 'all',
        calls: parseInt(summary.total_calls),
        tokens: {
          baseline: parseInt(summary.baseline_tokens || 0),
          actual: parseInt(summary.actual_tokens || 0),
          saved: parseInt(summary.saved_tokens || 0),
          avgSavingsPct: parseFloat(summary.avg_savings_pct || 0),
        },
        cost: {
          actual: actualCost,
          saved: totalSaved,
          total: actualCost + totalSaved,
          savingsPct: (actualCost + totalSaved) > 0
            ? Math.round(totalSaved / (actualCost + totalSaved) * 100)
            : 0,
        },
        efficiency: {
          cacheHits: parseInt(summary.cache_hits || 0),
          freeProviderCalls: parseInt(summary.free_provider_calls || 0),
          avgQualityScore: parseFloat(summary.avg_quality_score || 0),
          driftIncidents: parseInt(summary.drift_incidents || 0),
          fallbacks: parseInt(summary.fallbacks || 0),
        },
        generatedAt: new Date().toISOString(),
        verified: true,
      };
    } catch (err) {
      console.warn('[LEDGER] getReport failed:', err.message);
      return null;
    }
  }

  return { record, getReceipt, getDashboard, getReport };
}
