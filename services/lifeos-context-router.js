/**
 * SYNOPSIS: LifeOS context router v1 — suggest active stack from utterance or page.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const STACK_KEYWORDS = {
  lifere: /\b(lifere|life re|real estate|realtor|gci|listing|buyer|seller|boldtrail|go vegas|tc deal|outreach queue|commission)\b/i,
  socialmediaos: /\b(socialmediaos|smos|content brief|youtube|shorts|tiktok|hook|b-roll|transcript|go viral|reel)\b/i,
  builderos: /\b(builderos|blueprint|mission|deploy|railway|commit|ssot|amendment|preflight)\b/i,
};

const VIEW_SUGGESTIONS = [
  {
    id: 'lifere_workspace',
    re: /\b(lifere|life re|real estate|listing|buyer|seller|gci|commission|transaction coordinator|tc deal|pipeline)\b/i,
    page: 'lifeos-lifere.html',
    title: 'LifeRE workspace',
    stack_id: 'lifere',
    focus_prompt: 'Open the LifeRE workspace and show the most relevant pipeline or listing surface for this request.',
  },
  {
    id: 'socialmediaos_workspace',
    re: /\b(socialmediaos|smos|content brief|youtube|shorts|tiktok|reel|hook|b-roll|script ideas|video ideas)\b/i,
    page: 'lifeos-lifere.html',
    title: 'SocialMediaOS inside LifeRE',
    stack_id: 'socialmediaos',
    focus_prompt: 'Open LifeRE and orient to SocialMediaOS work for this request.',
  },
  {
    id: 'builderos_workspace',
    re: /\b(builderos|blueprint|mission|build step|repair the build|preflight|deploy|receipt|ssot)\b/i,
    page: 'lifeos-dashboard.html',
    title: 'BuilderOS command rail',
    stack_id: 'builderos',
    open_drawer: true,
    focus_prompt: 'Open the BuilderOS command rail and continue through Lumin for this request.',
  },
  {
    id: 'finance_workspace',
    re: /\b(finance|budget|money|expense|cash flow|profit|bank)\b/i,
    page: 'lifeos-finance.html',
    title: 'Finance',
    stack_id: 'lifeos',
  },
  {
    id: 'calendar_today',
    re: /\b(today|calendar|schedule|appointment|time block|plan my day|this afternoon|tomorrow)\b/i,
    page: 'lifeos-today.html',
    title: 'Today and calendar',
    stack_id: 'lifeos',
  },
  {
    id: 'health_workspace',
    re: /\b(health|sleep|energy|recovery|body|hrv|workout)\b/i,
    page: 'lifeos-health.html',
    title: 'Health',
    stack_id: 'lifeos',
  },
  {
    id: 'conflict_workspace',
    re: /\b(conflict|fight|argument|mediation|repair this|hard conversation)\b/i,
    page: 'lifeos-conflict.html',
    title: 'Conflict support',
    stack_id: 'lifeos',
  },
];

export function loadStackRegistry() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config/lifeos-stack-registry.json'), 'utf8'));
}

export function suggestStack({ text = '', explicitStack = null, page = null } = {}) {
  if (explicitStack) {
    const explicitView = suggestView({ text, explicitStack, page });
    return {
      stack_id: explicitStack,
      shell_entry: resolveShellEntry(explicitStack),
      reason: 'explicit',
      label: 'KNOW',
      ...explicitView,
    };
  }

  if (page === 'lifeos-lifere.html') {
    return {
      stack_id: 'lifere',
      shell_entry: '/overlay/lifeos-app.html?page=lifeos-lifere.html',
      reason: 'page_param',
      label: 'KNOW',
      page: 'lifeos-lifere.html',
      title: 'LifeRE workspace',
    };
  }

  const scores = Object.entries(STACK_KEYWORDS).map(([stackId, re]) => ({
    stackId,
    score: re.test(text) ? 1 : 0,
  }));
  const winner = scores.sort((a, b) => b.score - a.score).find((s) => s.score > 0);
  const view = suggestView({ text, explicitStack: winner?.stackId || null, page });

  if (winner) {
    return {
      stack_id: winner.stackId,
      shell_entry: resolveShellEntry(winner.stackId),
      reason: 'keyword_match',
      label: 'THINK',
      ...view,
    };
  }

  return {
    stack_id: 'lifeos',
    shell_entry: '/overlay/lifeos-app.html',
    reason: 'default_platform',
    label: 'KNOW',
    ...view,
  };
}

export function suggestView({ text = '', explicitStack = null, page = null } = {}) {
  if (page && page !== 'lifeos-app.html') {
    return { page };
  }
  for (const candidate of VIEW_SUGGESTIONS) {
    if (candidate.re.test(text) || (explicitStack && candidate.stack_id === explicitStack)) {
      return {
        view_id: candidate.id,
        page: candidate.page,
        title: candidate.title,
        focus_prompt: candidate.focus_prompt || '',
        open_drawer: candidate.open_drawer === true,
      };
    }
  }
  return {
    view_id: 'default_dashboard',
    page: 'lifeos-dashboard.html',
    title: 'Dashboard',
    focus_prompt: '',
    open_drawer: false,
  };
}

function resolveShellEntry(stackId) {
  const reg = loadStackRegistry();
  const stack = reg.stacks?.find((s) => s.stack_id === stackId);
  return stack?.shell_entry || reg.platform?.canonical_shell?.replace(/^public/, '/overlay') || '/overlay/lifeos-app.html';
}
