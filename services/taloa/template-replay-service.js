/**
 * SYNOPSIS: Template Replay Service
 */
import crypto from 'node:crypto';

/**
 * Template Replay Service
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 * Overlay print §64 item 7: template persistence + replay.
 *
 * Replays a persisted template when the environment signature still matches
 * the signature captured at persist time. If the signature differs, the
 * template is considered stale and is not replayed (the caller is expected
 * to persist a fresh template).
 *
 * Persistence is delegated to injected pool helpers / existing stores only.
 * This service does not invent or reference any SQL tables directly.
 *
 * @param {object} options
 * @param {object} options.pool - Injected database pool (or store facade).
 * @param {object} [options.logger] - Optional logger (e.g. console or pino).
 * @returns {object} Template replay service API.
 */
export function createTemplateReplayService({ pool, logger }) {
  const log = logger || console;

  /**
   * Compute a stable environment signature from an environment descriptor.
   * The signature is a SHA-256 hex digest of the canonical JSON of the
   * descriptor keys, sorted for determinism.
   *
   * @param {object} environment - Environment descriptor (e.g. app version, region, config hash).
   * @returns {string} SHA-256 hex digest.
   */
  function computeEnvironmentSignature(environment = {}) {
    const canonical = JSON.stringify(
      Object.keys(environment)
        .sort()
        .reduce((acc, key) => {
          acc[key] = environment[key];
          return acc;
        }, {}),
    );
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Persist a template for later replay.
   *
   * Delegates to the injected pool helper `persistTemplate` if available.
   * If the helper is not present, returns `{ persisted: false, reason: 'no-persist-helper' }`.
   *
   * @param {object} params
   * @param {string} params.templateId - Stable template identifier.
   * @param {object} params.template - Template payload to persist.
   * @param {object} [params.environment] - Environment descriptor captured at persist time.
   * @returns {Promise<object>} Persistence result.
   */
  async function persistTemplate({ templateId, template, environment = {} }) {
    if (!pool || typeof pool.persistTemplate !== 'function') {
      log.warn('[template-replay] persistTemplate helper not available; skipping persistence.');
      return { persisted: false, reason: 'no-persist-helper' };
    }

    const signature = computeEnvironmentSignature(environment);
    const result = await pool.persistTemplate({
      templateId,
      template,
      environmentSignature: signature,
      persistedAt: new Date().toISOString(),
    });

    return {
      persisted: true,
      templateId,
      environmentSignature: signature,
      result,
    };
  }

  /**
   * Replay a previously persisted template.
   *
   * The template is only replayed when the current environment signature
   * matches the signature captured at persist time. Otherwise the template
   * is considered stale.
   *
   * Delegates to the injected pool helper `loadTemplate` if available.
   *
   * @param {object} params
   * @param {string} params.templateId - Stable template identifier.
   * @param {object} [params.environment] - Current environment descriptor.
   * @returns {Promise<object>} Replay result.
   */
  async function replayTemplate({ templateId, environment = {} }) {
    if (!pool || typeof pool.loadTemplate !== 'function') {
      log.warn('[template-replay] loadTemplate helper not available; cannot replay.');
      return { replayed: false, reason: 'no-load-helper' };
    }

    const currentSignature = computeEnvironmentSignature(environment);
    const stored = await pool.loadTemplate({ templateId });

    if (!stored) {
      return { replayed: false, reason: 'template-not-found', templateId };
    }

    if (stored.environmentSignature !== currentSignature) {
      log.info(
        `[template-replay] environment signature mismatch for template "${templateId}"; skipping replay.`,
      );
      return {
        replayed: false,
        reason: 'environment-signature-mismatch',
        templateId,
      };
    }

    return {
      replayed: true,
      templateId,
      template: stored.template,
    };
  }

  /**
   * Determine whether a stored template is still valid for the given environment.
   *
   * @param {object} params
   * @param {string} params.templateId - Stable template identifier.
   * @param {object} [params.environment] - Current environment descriptor.
   * @returns {Promise<object>} Validity result.
   */
  async function isTemplateValid({ templateId, environment = {} }) {
    if (!pool || typeof pool.loadTemplate !== 'function') {
      return { valid: false, reason: 'no-load-helper' };
    }

    const stored = await pool.loadTemplate({ templateId });
    if (!stored) {
      return { valid: false, reason: 'template-not-found' };
    }

    const currentSignature = computeEnvironmentSignature(environment);
    return {
      valid: stored.environmentSignature === currentSignature,
      templateId,
    };
  }

  return {
    computeEnvironmentSignature,
    persistTemplate,
    replayTemplate,
    isTemplateValid,
  };
}