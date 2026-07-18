/**
 * SYNOPSIS: Lumin Chair system actions — real execution before counsel theater.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { loadPointBTarget } from './point-b-target-lite.js';
import { createLifeREAlphaDailyCycle } from './lifere-alpha-daily-cycle.js';
import { getLifeREAlphaReadinessSurface } from './lifere-alpha-readiness-surface.js';
import { executeLifeOSDirectAction } from './lifeos-direct-action.js';
import { isFounderPersonalLifeIntent } from './founder-life-admin-intent.js';
import { isExplicitDisplayOnlyRequest } from './lumin-conversation-routing.js';
import { isCounselOnlyBypass } from './chair-intent-signals.js';

const DO_PREFIX = /^\s*(do|execute|run)\s*:\s*/i;

export function shouldSkipInputNormalize(text = '', action = 'auto') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (DO_PREFIX.test(t)) return true;
  if (isFounderPersonalLifeIntent(t)) return true;
  if (isExplicitDisplayOnlyRequest(t, action)) return true;
  if (isCounselOnlyBypass(t)) return true;
  return parseLuminChairSystemAction(t).matched;
}

const NAV_PAGES = [
  { keys: ['lifere', 'life re', 'life-re'], page: 'lifeos-lifere.html', stack: 'lifere', action_type: 'open_lifere' },
  { keys: ['dashboard', 'home'], page: 'lifeos-dashboard.html', action_type: 'open_dashboard' },
  { keys: ['today'], page: 'lifeos-today.html', action_type: 'open_today' },
  { keys: ['mirror'], page: 'lifeos-mirror.html', action_type: 'open_mirror' },
  { keys: ['purpose'], page: 'lifeos-purpose.html', action_type: 'open_purpose' },
  { keys: ['food', 'food logger', 'nutrition'], page: 'lifeos-food.html', action_type: 'open_food' },
  { keys: ['habits', 'habit tracker'], page: 'lifeos-habits.html', action_type: 'open_habits' },
  { keys: ['cycle'], page: 'lifeos-cycle.html', action_type: 'open_cycle' },
  { keys: ['coach', 'therapy'], page: 'lifeos-coach.html', action_type: 'open_coach' },
  { keys: ['family'], page: 'lifeos-family.html', action_type: 'open_family' },
  { keys: ['household'], page: 'lifeos-household.html', action_type: 'open_household' },
  { keys: ['date night', 'datenight'], page: 'lifeos-date-night.html', action_type: 'open_date_night' },
  { keys: ['parent mode', 'meltdown'], page: 'lifeos-parent-mode.html', action_type: 'open_parent_mode' },
  { keys: ['twin directives', 'ui directives', 'twin'], page: 'lifeos-twin-directives.html', action_type: 'open_twin_directives' },
  { keys: ['member feedback', 'feedback'], page: 'lifeos-member-feedback.html', action_type: 'open_member_feedback' },
  { keys: ['victory vault', 'victories'], page: 'lifeos-victory-vault.html', action_type: 'open_victory' },
  { keys: ['ask your life', 'ask life'], page: 'lifeos-ask-your-life.html', action_type: 'open_ask_life' },
  { keys: ['decisions'], page: 'lifeos-decisions.html', action_type: 'open_decisions' },
  { keys: ['legacy'], page: 'lifeos-legacy.html', action_type: 'open_legacy' },
  { keys: ['ethics', 'privacy'], page: 'lifeos-ethics.html', action_type: 'open_ethics' },
  { keys: ['connect'], page: 'lifeos-connect.html', action_type: 'open_connect' },
  { keys: ['finance'], page: 'lifeos-finance.html', action_type: 'open_finance' },
  { keys: ['health'], page: 'lifeos-health.html', action_type: 'open_health' },
  { keys: ['chat', 'history'], page: 'lifeos-chat.html', action_type: 'open_chat' },
];

function parseNavigateAction(text = '') {
  const t = String(text || '').trim().toLowerCase().replace(/[?.!]+$/g, '');
  if (!t) return null;
  const verbs = ['open ', 'go to ', 'show ', 'launch ', 'switch to ', 'take me to ', 'navigate to '];
  let target = null;
  for (const verb of verbs) {
    if (t.startsWith(verb)) {
      target = t.slice(verb.length).replace(/^the\s+/, '').trim();
      break;
    }
  }
  if (!target) return null;
  for (const entry of NAV_PAGES) {
    if (entry.keys.some((k) => target === k || target.includes(k) || k.includes(target))) {
      return {
        matched: true,
        action_type: entry.action_type || 'navigate',
        shell_action: {
          type: 'navigate',
          page: entry.page,
          ...(entry.stack ? { stack: entry.stack } : {}),
        },
      };
    }
  }
  return null;
}

export function parseLuminChairSystemAction(text = '') {
  const t = String(text || '').trim();
  if (!t) return { matched: false, action_type: null };

  const nav = parseNavigateAction(t);
  if (nav) return nav;

  const rules = [
    {
      action_type: 'run_lifere_alpha_cycle',
      test: /\b(run|start|do)\s+(the\s+)?(alpha|lifere)\s+(daily\s+)?cycle\b/i,
    },
    {
      action_type: 'lifere_alpha_readiness',
      test: /\b(alpha\s+readiness|alpha\s+ready|am i alpha ready|check alpha)\b/i,
    },
    {
      action_type: 'redeploy',
      test: /\b(redeploy|deploy latest|ship to railway|push live)\b/i,
    },
    {
      action_type: 'setup_account',
      test: /\b(set\sup|sign\sup|create|open|register)\s+(an?\s+)?(account|subscription)\b/i,
    },
    {
      action_type: 'point_b_status',
      test: /\b(what(?:'s| is) point b|point b status|status of point b|current (program|mission|priority))\b/i,
    },
  ];

  for (const rule of rules) {
    if (rule.test.test(t)) {
      return { matched: true, action_type: rule.action_type, shell_action: rule.shell_action || null };
    }
  }
  return { matched: false, action_type: null };
}

async function triggerManagedRedeploy({ baseUrl, operatorKey, logger }) {
  if (!operatorKey) {
    return { ok: false, error: 'operator_key_missing' };
  }
  const url = `${String(baseUrl || '').replace(/\/$/, '')}/api/v1/railway/managed-env/build-from-latest`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': operatorKey,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok !== false, status: res.status, data, error: data.error || null };
  } catch (err) {
    logger?.warn?.('[LUMIN-CHAIR-ACTION] redeploy failed:', err.message);
    return { ok: false, error: err.message };
  }
}

function extractSignupTarget(text = '') {
  const t = String(text || '');
  const urlMatch = t.match(/https?:\/\/[^\s<>"']+/i);
  if (urlMatch) {
    return { url: urlMatch[0].replace(/[.,;:!?)]+$/, ''), service: null };
  }
  const named = t.match(/\b(?:for|on|at|with)\s+([A-Za-z0-9][A-Za-z0-9._-]{1,40})(?:\s|$|[.,!?])/i);
  if (named) {
    const service = named[1].toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const knownHosts = {
      postmark: 'https://account.postmarkapp.com/sign_up',
      square: 'https://squareup.com/signup',
      mindbody: 'https://www.mindbodyonline.com/',
      jane: 'https://jane.app/signup',
      jane_app: 'https://jane.app/signup',
    };
    if (knownHosts[service]) return { url: knownHosts[service], service };
    return { url: null, service };
  }
  return { url: null, service: null };
}

async function triggerFounderAuthoritySignup({ baseUrl, operatorKey, text, logger }) {
  if (!operatorKey) {
    return { ok: false, error: 'operator_key_missing' };
  }
  const target = extractSignupTarget(text);
  if (!target.url && !target.service) {
    return {
      ok: false,
      error: 'signup_target_missing',
      message: 'Say which service or paste the signup URL (e.g. “set up an account at https://…”).',
    };
  }
  const endpoint = `${String(baseUrl || '').replace(/\/$/, '')}/api/v1/browser-agent/signup`;
  const body = {
    founder_authority: true,
    url: target.url || undefined,
    service: target.service || undefined,
    recipe: target.service || undefined,
  };
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': operatorKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok && data.ok !== false,
      status: res.status,
      data,
      target,
      error: data.error || null,
    };
  } catch (err) {
    logger?.warn?.('[LUMIN-CHAIR-ACTION] signup failed:', err.message);
    return { ok: false, error: err.message, target };
  }
}

export async function tryLuminChairSystemAction(text, deps = {}) {
  const { pool, logger = console, operatorKey, founderBuildBaseUrl, userId } = deps;

  // Navigate / keyword actions first — never blocked by proof-action pool work.
  const parsed = parseLuminChairSystemAction(text);
  if (parsed.matched && parsed.shell_action) {
    const label = parsed.action_type === 'open_lifere'
      ? 'LifeRE'
      : (parsed.shell_action.page || parsed.action_type || 'page');
    return {
      matched: true,
      executed: true,
      action_type: parsed.action_type,
      ok: true,
      command_truth: 'COMMAND_RAN',
      shell_action: parsed.shell_action,
      human_summary: `Opening ${label} now — navigation is executing in your shell.`,
      done_synopsis: `Navigated to ${parsed.shell_action.page}`,
    };
  }

  const direct = userId
    ? await executeLifeOSDirectAction(pool, {
      userId,
      text,
      baseUrl: founderBuildBaseUrl,
    }).catch((err) => {
      logger?.warn?.('[LUMIN-CHAIR-ACTION] direct action failed:', err.message);
      return { matched: false };
    })
    : { matched: false };

  if (direct.matched) {
    return {
      matched: true,
      executed: direct.executed === true,
      action_type: direct.action_type || 'direct_action',
      ok: direct.ok === true,
      human_summary: direct.visible_founder_message || direct.error || 'Direct action complete.',
      receipt: direct.result_record || direct.proof_record || null,
      command_truth: direct.executed ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
    };
  }

  if (!parsed.matched) {
    return { matched: false, executed: false, action_type: null };
  }

  try {
    switch (parsed.action_type) {
      case 'run_lifere_alpha_cycle': {
        const cycle = createLifeREAlphaDailyCycle({ pool, logger });
        const result = await cycle.runDailyCycle({ userId: 'adam' });
        const ok = result.ok === true;
        return {
          matched: true,
          executed: true,
          action_type: parsed.action_type,
          ok,
          command_truth: 'COMMAND_RAN',
          human_summary: ok
            ? `Alpha daily cycle ran — ${result.steps?.filter((s) => s.ok).length || 0}/${result.steps?.length || 0} steps passed.`
            : `Alpha daily cycle failed: ${result.error || 'unknown'}`,
          receipt: result,
        };
      }
      case 'lifere_alpha_readiness': {
        const surface = getLifeREAlphaReadinessSurface({ pool: Boolean(pool), pgTablesOk: null });
        const failed = (surface.checklist || []).filter((c) => c.ok === false);
        return {
          matched: true,
          executed: true,
          action_type: parsed.action_type,
          ok: surface.ready_for_alpha_testing === true,
          command_truth: 'COMMAND_RAN',
          human_summary: surface.ready_for_alpha_testing
            ? 'Alpha readiness: PASS — ready for founder testing.'
            : `Alpha readiness: gaps remain — ${failed.map((f) => f.label).join('; ') || 'see checklist'}`,
          receipt: surface,
        };
      }
      case 'redeploy': {
        const base = founderBuildBaseUrl || process.env.PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
        const redeploy = await triggerManagedRedeploy({
          baseUrl: base?.startsWith('http') ? base : `https://${base}`,
          operatorKey,
          logger,
        });
        return {
          matched: true,
          executed: redeploy.ok === true,
          action_type: parsed.action_type,
          ok: redeploy.ok === true,
          command_truth: redeploy.ok ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
          human_summary: redeploy.ok
            ? 'Redeploy triggered — build-from-latest is running on Railway.'
            : `Redeploy failed: ${redeploy.error || redeploy.data?.error || 'unknown'}`,
          receipt: redeploy.data || redeploy,
        };
      }
      case 'setup_account': {
        const base = founderBuildBaseUrl || process.env.PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
        const baseUrl = base?.startsWith('http') ? base : `https://${base}`;
        const signup = await triggerFounderAuthoritySignup({
          baseUrl,
          operatorKey,
          text,
          logger,
        });
        const targetLabel = signup.target?.url || signup.target?.service || 'account';
        const siteUrl = signup.target?.url || null;
        return {
          matched: true,
          executed: signup.ok === true,
          action_type: parsed.action_type,
          ok: signup.ok === true,
          command_truth: signup.ok ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
          human_summary: signup.ok
            ? `Account setup started for ${targetLabel}. Opening Connect in LifeOS — if a captcha or email verify is needed, use the guided Open site / Open email buttons there (secrets stay hidden until you reveal them).`
            : `Account setup blocked: ${signup.error || signup.data?.error || signup.message || 'unknown'}`,
          receipt: signup.data || signup,
          shell_action: {
            type: 'connect_guide',
            page: 'lifeos-connect.html',
            url: siteUrl,
            inboxUrl: 'https://mail.google.com/mail/u/0/#search/newer_than:1d',
          },
        };
      }
      case 'point_b_status': {
        const target = loadPointBTarget();
        const summary = target?.label
          ? `Point B: ${target.label} (${target.mission_id || 'no mission id'})`
          : 'Point B target not loaded — check builderos-reboot/BP_PRIORITY.json';
        return {
          matched: true,
          executed: true,
          action_type: parsed.action_type,
          ok: Boolean(target?.mission_id),
          command_truth: 'COMMAND_RAN',
          human_summary: summary,
          receipt: target,
        };
      }
      default:
        return { matched: false, executed: false, action_type: null };
    }
  } catch (err) {
    logger?.warn?.('[LUMIN-CHAIR-ACTION]', err.message);
    return {
      matched: true,
      executed: false,
      action_type: parsed.action_type,
      ok: false,
      command_truth: 'NO_COMMAND_RAN',
      human_summary: `System action failed: ${err.message}`,
      error: err.message,
    };
  }
}