/**
 * SYNOPSIS: Express middleware — every res.json passes through truth spine before leaving.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { enforceTruthOnResponseBody, TRUTH_SPINE_VERSION } from '../services/truth-enforcement-spine.js';

function inferChannel(req) {
  if (req.path?.includes('founder-interface')) return 'founder_interface';
  if (req.path?.includes('voice-rail')) return 'voice_rail';
  if (req.path?.includes('/chat')) return 'chat';
  if (req.path?.includes('lifere')) return 'lifere';
  return 'api';
}

export function createTruthResponseEnforcer({ logger } = {}) {
  return function truthResponseEnforcer(req, res, next) {
    if (req.path?.startsWith('/overlay/') || req.path?.startsWith('/public/')) {
      return next();
    }

    const channel = inferChannel(req);
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function truthGatedJson(body) {
      try {
        const responseChannel = (body && body.chair_channel) || channel;
        const locked = enforceTruthOnResponseBody(body, responseChannel, req);
        return originalJson(locked);
      } catch (err) {
        logger?.warn?.({ err: err.message, path: req.path }, '[TRUTH-SPINE] res.json gate error');
        return originalJson({
          ok: false,
          pass_fail: 'FAIL',
          command_truth: 'NO_COMMAND_RAN',
          first_blocker: `Truth spine blocked malformed response: ${err.message}`,
          truth_spine_version: TRUTH_SPINE_VERSION,
        });
      }
    };

    res.send = function truthGatedSend(body) {
      try {
        const responseChannel = (body && typeof body === 'object' && body.chair_channel)
          || (typeof body === 'string' && body.trimStart().startsWith('{') && JSON.parse(body).chair_channel)
          || channel;
        if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
          return originalSend(enforceTruthOnResponseBody(body, responseChannel, req));
        }
        if (typeof body === 'string') {
          const trimmed = body.trimStart();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const parsed = JSON.parse(body);
            if (parsed && typeof parsed === 'object') {
              return originalSend(JSON.stringify(enforceTruthOnResponseBody(parsed, responseChannel, req)));
            }
          }
        }
      } catch (err) {
        logger?.warn?.({ err: err.message, path: req.path }, '[TRUTH-SPINE] res.send gate error');
      }
      return originalSend(body);
    };

    next();
  };
}

export default createTruthResponseEnforcer;
