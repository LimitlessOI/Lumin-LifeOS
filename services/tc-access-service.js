/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 *
 * tc-access-service.js
 * Bootstraps and verifies the access prerequisites for TC email, GLVAR,
 * TransactionDesk, and SkySlope workflows.
 */

import { resolveTCImapConfig } from './tc-imap-config.js';
import {
  getExpOktaCredentialsFromEnv,
  getGLVARCredentialsFromEnv,
  getTCImapHost,
  getTCImapPassword,
  getTCImapPort,
  getTCImapUser,
} from './credential-aliases.js';

const GLVAR_ACCOUNT_ID = '232953';
const DEFAULT_EXP_EMAIL = 'adam.hopkins@exprealty.com';

function mask(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= 4) return '****';
  return `${text.slice(0, 2)}****${text.slice(-2)}`;
}

function normalizeEnvEntry(name, value, description, secret = false) {
  return {
    name,
    description,
    secret,
    present: Boolean(value),
    masked: value ? (secret ? mask(value) : String(value)) : '',
  };
}

/** UI + API: where to get each value; secrets use leave_value_blank_in_seed. */
export const TC_ENV_HELP = {
  TC_IMAP_APP_PASSWORD: {
    leave_value_blank_in_seed: true,
    summary:
      'Google “App password” for the TC mailbox (16 characters). Requires 2-Step Verification on the Google account.',
    links: [{ label: 'Google: App passwords', href: 'https://support.google.com/accounts/answer/185833' }],
  },
  GLVAR_mls_Username: {
    summary: 'GLVAR / Clareity IAM username—same sign-in you use for MLS and TransactionDesk.',
    links: [{ label: 'GLVAR Clareity (sign in)', href: 'https://glvar.clareityiam.net/idp/login' }],
  },
  GLVAR_mls_Password: {
    leave_value_blank_in_seed: true,
    summary: 'Your Clareity password (not posted here). You can also save via Access Setup form → vault.',
    links: [
      { label: 'GLVAR / Las Vegas Realtors', href: 'https://www.lasvegasrealtor.com/' },
    ],
  },
  exp_okta_Username: {
    summary: 'eXp email for Okta (example: name@exprealty.com).',
    links: [{ label: 'eXp Okta', href: 'https://exprealty.okta.com/' }],
  },
  exp_okta_Password: {
    leave_value_blank_in_seed: true,
    summary: 'Your eXp Okta password. Prefer the portal “Access Setup” form so it lands in the vault.',
    links: [{ label: 'eXp Okta', href: 'https://exprealty.okta.com/' }],
  },
  COMMAND_CENTER_KEY: {
    summary: 'LifeOS API key for authenticated routes. Copy from Railway → your service → Variables.',
    links: [
      { label: 'Railway: Variables', href: 'https://docs.railway.app/develop/variables' },
    ],
  },
  EMAIL_WEBHOOK_SECRET: {
    leave_value_blank_in_seed: true,
    summary: 'Only if you use Postmark inbound webhooks; generate any random string.',
    links: [{ label: 'Postmark webhooks', href: 'https://postmarkapp.com/developer/webhooks/webhooks-overview' }],
  },
  TWILIO_WEBHOOK_SECRET: {
    leave_value_blank_in_seed: true,
    summary: 'Only for Twilio status callbacks; set in Twilio Console if needed.',
    links: [{ label: 'Twilio webhooks', href: 'https://www.twilio.com/docs/usage/webhooks' }],
  },
  ASANA_ACCESS_TOKEN: {
    leave_value_blank_in_seed: true,
    summary: 'Optional. Create a personal access token in Asana Developer Console.',
    links: [{ label: 'Asana API', href: 'https://developers.asana.com/docs/personal-access-token' }],
  },
};

const TC_SETUP_PLAYBOOK = [
  {
    step: 1,
    title: 'Command key in this portal',
    detail:
      'In Railway, open your LifeOS service → Variables → copy COMMAND_CENTER_KEY (or the key your app uses for x-api-key). Paste it at the top of this page and click Save.',
    links: [
      { label: 'Railway: environment variables', href: 'https://docs.railway.app/develop/variables' },
    ],
  },
  {
    step: 2,
    title: 'TC mailbox + GLVAR + eXp',
    detail:
      'Fill Access Setup (work email, IMAP app password, GLVAR, eXp Okta) and click Save access. Non-secrets can also be synced via managed env if you use it; secrets stay with you.',
    links: [{ label: 'Google App Passwords', href: 'https://support.google.com/accounts/answer/185833' }],
  },
  {
    step: 3,
    title: 'If git push or commit failed with “SSOT VIOLATION”',
    detail:
      'The repo checks that JS changes include @ssot tags and matching amendment updates. Other open edits can trigger the hook even if your commit is clean. Options: (A) commit only TC files with amendments updated, or (B) push with: git push --no-verify (use when you accept bypassing the hook).',
    links: [{ label: 'Cursor / git hooks', href: 'https://git-scm.com/docs/githooks' }],
  },
];

function attachEnvHelp(row) {
  const help = TC_ENV_HELP[row.name];
  return help ? { ...row, help } : { ...row, help: null };
}

function buildEnvTemplate({
  workEmail = '',
  tcImapUser = '',
  tcAgentName = '',
  tcAgentPhone = '',
  tcEmailFrom = '',
  presenceMap = {},
} = {}) {
  const resolvedWorkEmail = workEmail || getTCImapUser() || process.env.WORK_EMAIL || process.env.TC_EMAIL_FROM || '';
  const resolvedImapUser = tcImapUser || getTCImapUser() || resolvedWorkEmail || '';
  const resolvedEmailFrom = tcEmailFrom || resolvedWorkEmail || process.env.TC_EMAIL_FROM || '';
  const resolvedAgentName = tcAgentName || process.env.TC_AGENT_NAME || 'Adam Hopkins';
  const resolvedAgentPhone = tcAgentPhone || process.env.TC_AGENT_PHONE || '';

  const imapPasswordPresent = Boolean(presenceMap.TC_IMAP_APP_PASSWORD || getTCImapPassword());
  const emailWebhookPresent = Boolean(presenceMap.EMAIL_WEBHOOK_SECRET || process.env.EMAIL_WEBHOOK_SECRET);
  const twilioWebhookPresent = Boolean(presenceMap.TWILIO_WEBHOOK_SECRET || process.env.TWILIO_WEBHOOK_SECRET);
  const asanaTokenPresent = Boolean(presenceMap.ASANA_ACCESS_TOKEN || process.env.ASANA_ACCESS_TOKEN);

  const glvarEnv = getGLVARCredentialsFromEnv();
  const expEnv = getExpOktaCredentialsFromEnv();
  const glvarUserKnown = Boolean(presenceMap.GLVAR_mls_Username || glvarEnv.username);
  const glvarPassKnown = Boolean(presenceMap.GLVAR_mls_Password || glvarEnv.password);
  const expUserKnown = Boolean(presenceMap.exp_okta_Username || expEnv.username);
  const expPassKnown = Boolean(presenceMap.exp_okta_Password || expEnv.password);

  const rows = [
    { name: 'TC_IMAP_HOST', value: getTCImapHost(), known: true, secret: false, description: 'IMAP host for the TC mailbox' },
    { name: 'TC_IMAP_PORT', value: getTCImapPort(), known: true, secret: false, description: 'IMAP port for the TC mailbox' },
    { name: 'TC_IMAP_USER', value: resolvedImapUser, known: Boolean(resolvedImapUser), secret: false, description: 'Mailbox address the TC scanner reads' },
    { name: 'TC_IMAP_APP_PASSWORD', value: '', known: imapPasswordPresent, secret: true, description: 'IMAP app password for the mailbox' },
    { name: 'WORK_EMAIL', value: resolvedWorkEmail, known: Boolean(resolvedWorkEmail), secret: false, description: 'Primary work inbox for alerts and fallback identity' },
    { name: 'TC_EMAIL_FROM', value: resolvedEmailFrom, known: Boolean(resolvedEmailFrom), secret: false, description: 'From-address for TC communications' },
    { name: 'TC_AGENT_NAME', value: resolvedAgentName, known: Boolean(resolvedAgentName), secret: false, description: 'Agent or TC display name' },
    { name: 'TC_AGENT_PHONE', value: resolvedAgentPhone, known: Boolean(resolvedAgentPhone), secret: false, description: 'Outbound TC contact phone' },
    { name: 'EMAIL_WEBHOOK_SECRET', value: '', known: emailWebhookPresent, secret: true, description: 'Inbound email webhook secret' },
    { name: 'TWILIO_WEBHOOK_SECRET', value: '', known: twilioWebhookPresent, secret: true, description: 'Inbound Twilio webhook secret' },
    { name: 'ASANA_ACCESS_TOKEN', value: '', known: asanaTokenPresent, secret: true, description: 'Optional Asana sync token' },
    { name: 'ASANA_TC_PROJECT_GID', value: process.env.ASANA_TC_PROJECT_GID || '', known: Boolean(process.env.ASANA_TC_PROJECT_GID), secret: false, description: 'Optional Asana TC project id' },
    {
      name: 'GLVAR_mls_Username',
      value: glvarEnv.username || '',
      known: glvarUserKnown,
      secret: false,
      description: 'GLVAR Clareity / MLS username (Railway env alias)',
    },
    {
      name: 'GLVAR_mls_Password',
      value: '',
      known: glvarPassKnown,
      secret: true,
      description: 'GLVAR Clareity password — leave blank in exports; set in Railway or portal form',
    },
    {
      name: 'exp_okta_Username',
      value: expEnv.username || '',
      known: expUserKnown,
      secret: false,
      description: 'eXp Okta username (email)',
    },
    {
      name: 'exp_okta_Password',
      value: '',
      known: expPassKnown,
      secret: true,
      description: 'eXp Okta password — leave blank in exports; set in Railway or portal form',
    },
    {
      name: 'COMMAND_CENTER_KEY',
      value: '',
      known: Boolean(process.env.COMMAND_CENTER_KEY),
      secret: true,
      description: 'API key for TC routes (browser portal uses localStorage copy)',
    },
  ];
  return rows.map(attachEnvHelp);
}

export function createTCAccessService({
  accountManager,
  managedEnvService = null,
  logger = console,
} = {}) {
  const TC_MANAGED_ENV_NAMES = [
    'TC_IMAP_HOST',
    'TC_IMAP_PORT',
    'TC_IMAP_USER',
    'TC_IMAP_APP_PASSWORD',
    'WORK_EMAIL',
    'TC_EMAIL_FROM',
    'TC_AGENT_NAME',
    'TC_AGENT_PHONE',
    'EMAIL_WEBHOOK_SECRET',
    'TWILIO_WEBHOOK_SECRET',
    'ASANA_ACCESS_TOKEN',
    'ASANA_TC_PROJECT_GID',
    'GLVAR_mls_Username',
    'GLVAR_mls_Password',
    'exp_okta_Username',
    'exp_okta_Password',
    'COMMAND_CENTER_KEY',
  ];

  async function getManagedEnvSnapshot() {
    if (!managedEnvService?.getSyncPlan) return null;
    try {
      const plan = await managedEnvService.getSyncPlan({ names: TC_MANAGED_ENV_NAMES });
      const presenceMap = Object.fromEntries(
        (plan.plan || []).map((item) => [item.envName, Boolean(item.currentPresent || item.maskedDesired)])
      );
      return {
        enabled: true,
        ok: (plan.plan || []).every((item) => item.same || item.action === 'skip'),
        plan: plan.plan || [],
        presenceMap,
      };
    } catch (error) {
      return {
        enabled: true,
        ok: false,
        error: error.message,
        plan: [],
        presenceMap: {},
      };
    }
  }

  async function getAccessReadiness() {
    const imapConfig = await resolveTCImapConfig({ accountManager, logger });
    const glvar = await accountManager?.getAccount?.('glvar_mls', GLVAR_ACCOUNT_ID);
    const expOkta = await accountManager?.getAccount?.('exp_okta', DEFAULT_EXP_EMAIL);
    const glvarEnv = getGLVARCredentialsFromEnv();
    const expOktaEnv = getExpOktaCredentialsFromEnv();
    const managedEnv = await getManagedEnvSnapshot();

    const env = [
      normalizeEnvEntry('TC_IMAP_HOST', getTCImapHost(), 'IMAP host for TC mailbox'),
      normalizeEnvEntry('TC_IMAP_PORT', getTCImapPort(), 'IMAP port for TC mailbox'),
      normalizeEnvEntry('TC_IMAP_USER', getTCImapUser(), 'Mailbox address TC scanner will read'),
      normalizeEnvEntry('TC_IMAP_APP_PASSWORD', getTCImapPassword(), 'IMAP app password', true),
      normalizeEnvEntry('WORK_EMAIL', process.env.WORK_EMAIL || '', 'Primary work email for alerts and fallback mailbox identity'),
      normalizeEnvEntry('TC_EMAIL_FROM', process.env.TC_EMAIL_FROM || process.env.EMAIL_FROM || '', 'From-address for TC communications'),
      normalizeEnvEntry('TC_AGENT_NAME', process.env.TC_AGENT_NAME || '', 'Agent/TC display name'),
      normalizeEnvEntry('TC_AGENT_PHONE', process.env.TC_AGENT_PHONE || '', 'Outbound TC contact phone'),
      normalizeEnvEntry('EMAIL_WEBHOOK_SECRET', process.env.EMAIL_WEBHOOK_SECRET || '', 'Inbound email webhook secret', true),
      normalizeEnvEntry('TWILIO_WEBHOOK_SECRET', process.env.TWILIO_WEBHOOK_SECRET || '', 'Inbound Twilio webhook secret', true),
      normalizeEnvEntry('ASANA_ACCESS_TOKEN', process.env.ASANA_ACCESS_TOKEN || '', 'Optional Asana sync token', true),
      normalizeEnvEntry('ASANA_TC_PROJECT_GID', process.env.ASANA_TC_PROJECT_GID || '', 'Optional Asana project for TC sync'),
      normalizeEnvEntry('GLVAR_mls_Username', glvarEnv.username, 'GLVAR env fallback username'),
      normalizeEnvEntry('GLVAR_mls_Password', glvarEnv.password, 'GLVAR env fallback password', true),
      normalizeEnvEntry('exp_okta_Username', expOktaEnv.username, 'eXp Okta env fallback username'),
      normalizeEnvEntry('exp_okta_Password', expOktaEnv.password, 'eXp Okta env fallback password', true),
    ];

    const vault = [
      {
        service: 'email_imap',
        key: imapConfig?.auth?.user || process.env.TC_IMAP_USER || process.env.WORK_EMAIL || '',
        description: 'Mailbox credential for IMAP reads when not stored directly as env',
        present: Boolean(imapConfig?.auth?.pass),
      },
      {
        service: 'glvar_mls',
        key: GLVAR_ACCOUNT_ID,
        description: 'GLVAR/TransactionDesk Clareity credentials (vault or env alias)',
        present: Boolean((glvar?.password && (glvar?.username || glvar?.emailUsed)) || glvarEnv.present),
      },
      {
        service: 'exp_okta',
        key: DEFAULT_EXP_EMAIL,
        description: 'eXp Okta credential for SkySlope/BoldTrail SSO (vault or env alias)',
        present: Boolean((expOkta?.password && (expOkta?.username || expOkta?.emailUsed)) || expOktaEnv.present),
      },
    ];

    const readiness = {
      imap_ready: Boolean(imapConfig?.host && imapConfig?.auth?.user && imapConfig?.auth?.pass),
      glvar_ready: Boolean(vault.find((item) => item.service === 'glvar_mls')?.present),
      skyslope_ready: Boolean(vault.find((item) => item.service === 'exp_okta')?.present),
      transactiondesk_ready: Boolean(vault.find((item) => item.service === 'glvar_mls')?.present),
      asana_ready: Boolean(process.env.ASANA_ACCESS_TOKEN && process.env.ASANA_TC_PROJECT_GID),
    };

    return {
      generated_at: new Date().toISOString(),
      readiness,
      env,
      vault,
      bootstrap_defaults: {
        TC_IMAP_HOST: getTCImapHost(),
        TC_IMAP_PORT: getTCImapPort(),
        TC_IMAP_USER: getTCImapUser(),
        WORK_EMAIL: getTCImapUser() || process.env.WORK_EMAIL || '',
        TC_AGENT_NAME: process.env.TC_AGENT_NAME || 'Adam Hopkins',
        TC_AGENT_PHONE: process.env.TC_AGENT_PHONE || '',
        TC_EMAIL_FROM: process.env.TC_EMAIL_FROM || getTCImapUser() || process.env.WORK_EMAIL || '',
      },
      env_template: buildEnvTemplate({ presenceMap: managedEnv?.presenceMap || {} }),
      setup_playbook: TC_SETUP_PLAYBOOK,
      managed_env: managedEnv,
      remaining_blockers: [
        ...(!readiness.imap_ready ? ['TC email access is not fully configured'] : []),
        ...(!readiness.glvar_ready ? ['GLVAR Clareity credentials are not available via vault or env alias'] : []),
        ...(!readiness.skyslope_ready ? ['eXp Okta credentials are not available via vault or env alias'] : []),
      ],
    };
  }

  async function bootstrapAccess({
    actor = 'tc_access_bootstrap',
    workEmail = '',
    tcImapUser = '',
    tcAgentName = '',
    tcAgentPhone = '',
    tcEmailFrom = '',
    emailWebhookSecret = '',
    twilioWebhookSecret = '',
    imapPassword = '',
    glvarUsername = '',
    glvarPassword = '',
    expOktaUsername = '',
    expOktaPassword = '',
    asanaAccessToken = '',
    asanaProjectGid = '',
  } = {}) {
    const desiredVars = {
      TC_IMAP_HOST: getTCImapHost(),
      TC_IMAP_PORT: getTCImapPort(),
      TC_IMAP_USER: tcImapUser || workEmail || getTCImapUser() || process.env.WORK_EMAIL || '',
      WORK_EMAIL: workEmail || process.env.WORK_EMAIL || '',
      TC_EMAIL_FROM: tcEmailFrom || workEmail || process.env.TC_EMAIL_FROM || process.env.WORK_EMAIL || '',
      TC_AGENT_NAME: tcAgentName || process.env.TC_AGENT_NAME || 'Adam Hopkins',
      TC_AGENT_PHONE: tcAgentPhone || process.env.TC_AGENT_PHONE || '',
      ...(emailWebhookSecret ? { EMAIL_WEBHOOK_SECRET: emailWebhookSecret } : {}),
      ...(twilioWebhookSecret ? { TWILIO_WEBHOOK_SECRET: twilioWebhookSecret } : {}),
      ...(imapPassword ? { TC_IMAP_APP_PASSWORD: imapPassword } : {}),
      ...(asanaAccessToken ? { ASANA_ACCESS_TOKEN: asanaAccessToken } : {}),
      ...(asanaProjectGid ? { ASANA_TC_PROJECT_GID: asanaProjectGid } : {}),
    };

    const varsToStore = Object.fromEntries(Object.entries(desiredVars).filter(([, value]) => String(value || '').trim()));
    let managedEnv = null;
    if (managedEnvService && Object.keys(varsToStore).length) {
      const stored = await managedEnvService.upsertDesiredVars(varsToStore, actor);
      const sync = await managedEnvService.syncDesiredVars({ actor, names: Object.keys(varsToStore) }).catch((error) => ({ ok: false, error: error.message }));
      managedEnv = { stored, sync };
    }

    const storedAccounts = [];
    if (imapPassword && (tcImapUser || workEmail || getTCImapUser() || process.env.WORK_EMAIL)) {
      const emailUsed = tcImapUser || workEmail || getTCImapUser() || process.env.WORK_EMAIL;
      storedAccounts.push(await accountManager.upsertAccount({
        serviceName: 'email_imap',
        emailUsed,
        username: emailUsed,
        password: imapPassword,
        status: 'active',
        notes: 'Stored by TC access bootstrap',
        lastAction: 'tc_access_bootstrap',
      }));
    }
    if (glvarPassword && glvarUsername) {
      storedAccounts.push(await accountManager.upsertAccount({
        serviceName: 'glvar_mls',
        emailUsed: GLVAR_ACCOUNT_ID,
        username: glvarUsername,
        password: glvarPassword,
        status: 'active',
        notes: 'Stored by TC access bootstrap',
        lastAction: 'tc_access_bootstrap',
      }));
    }
    if (expOktaPassword && (expOktaUsername || DEFAULT_EXP_EMAIL)) {
      const emailUsed = expOktaUsername || DEFAULT_EXP_EMAIL;
      storedAccounts.push(await accountManager.upsertAccount({
        serviceName: 'exp_okta',
        emailUsed,
        username: expOktaUsername || emailUsed,
        password: expOktaPassword,
        status: 'active',
        notes: 'Stored by TC access bootstrap',
        lastAction: 'tc_access_bootstrap',
      }));
    }

    return {
      ok: true,
      managed_env: managedEnv,
      stored_accounts: storedAccounts,
      readiness: await getAccessReadiness(),
    };
  }

  async function seedKnownEnvDefaults({
    actor = 'tc_seed_defaults',
    workEmail = '',
    tcImapUser = '',
    tcAgentName = '',
    tcAgentPhone = '',
    tcEmailFrom = '',
  } = {}) {
    const managedEnvSnapshot = await getManagedEnvSnapshot();
    const template = buildEnvTemplate({
      workEmail,
      tcImapUser,
      tcAgentName,
      tcAgentPhone,
      tcEmailFrom,
      presenceMap: managedEnvSnapshot?.presenceMap || {},
    });
    const varsToStore = Object.fromEntries(
      template
        .filter((item) => item.known && !item.secret && String(item.value || '').trim())
        .map((item) => [item.name, item.value])
    );

    let managedEnvResult = null;
    if (managedEnvService && Object.keys(varsToStore).length) {
      const stored = await managedEnvService.upsertDesiredVars(varsToStore, actor);
      const sync = await managedEnvService.syncDesiredVars({ actor, names: Object.keys(varsToStore) }).catch((error) => ({ ok: false, error: error.message }));
      managedEnvResult = { stored, sync };
    }

    return {
      ok: true,
      seeded_names: Object.keys(varsToStore),
      pending_secret_names: template.filter((item) => item.secret && !item.known).map((item) => item.name),
      env_template: template,
      managed_env: {
        snapshot: managedEnvSnapshot,
        seed_result: managedEnvResult,
      },
      readiness: await getAccessReadiness(),
    };
  }

  return {
    bootstrapAccess,
    getAccessReadiness,
    seedKnownEnvDefaults,
  };
}

export default createTCAccessService;
