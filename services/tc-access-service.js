/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 *
 * tc-access-service.js
 * Bootstraps and verifies the access prerequisites for TC email, GLVAR,
 * TransactionDesk, and SkySlope workflows.
 */

import { resolveTCImapConfig } from './tc-imap-config.js';

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

function buildEnvTemplate({
  workEmail = '',
  tcImapUser = '',
  tcAgentName = '',
  tcAgentPhone = '',
  tcEmailFrom = '',
} = {}) {
  const resolvedWorkEmail = workEmail || process.env.WORK_EMAIL || process.env.TC_EMAIL_FROM || '';
  const resolvedImapUser = tcImapUser || resolvedWorkEmail || process.env.TC_IMAP_USER || '';
  const resolvedEmailFrom = tcEmailFrom || resolvedWorkEmail || process.env.TC_EMAIL_FROM || '';
  const resolvedAgentName = tcAgentName || process.env.TC_AGENT_NAME || 'Adam Hopkins';
  const resolvedAgentPhone = tcAgentPhone || process.env.TC_AGENT_PHONE || '';

  return [
    { name: 'TC_IMAP_HOST', value: process.env.TC_IMAP_HOST || process.env.IMAP_HOST || 'imap.gmail.com', known: true, secret: false, description: 'IMAP host for the TC mailbox' },
    { name: 'TC_IMAP_PORT', value: process.env.TC_IMAP_PORT || process.env.IMAP_PORT || '993', known: true, secret: false, description: 'IMAP port for the TC mailbox' },
    { name: 'TC_IMAP_USER', value: resolvedImapUser, known: Boolean(resolvedImapUser), secret: false, description: 'Mailbox address the TC scanner reads' },
    { name: 'TC_IMAP_APP_PASSWORD', value: '', known: false, secret: true, description: 'IMAP app password for the mailbox' },
    { name: 'WORK_EMAIL', value: resolvedWorkEmail, known: Boolean(resolvedWorkEmail), secret: false, description: 'Primary work inbox for alerts and fallback identity' },
    { name: 'TC_EMAIL_FROM', value: resolvedEmailFrom, known: Boolean(resolvedEmailFrom), secret: false, description: 'From-address for TC communications' },
    { name: 'TC_AGENT_NAME', value: resolvedAgentName, known: Boolean(resolvedAgentName), secret: false, description: 'Agent or TC display name' },
    { name: 'TC_AGENT_PHONE', value: resolvedAgentPhone, known: Boolean(resolvedAgentPhone), secret: false, description: 'Outbound TC contact phone' },
    { name: 'EMAIL_WEBHOOK_SECRET', value: '', known: false, secret: true, description: 'Inbound email webhook secret' },
    { name: 'TWILIO_WEBHOOK_SECRET', value: '', known: false, secret: true, description: 'Inbound Twilio webhook secret' },
    { name: 'ASANA_ACCESS_TOKEN', value: '', known: false, secret: true, description: 'Optional Asana sync token' },
    { name: 'ASANA_TC_PROJECT_GID', value: process.env.ASANA_TC_PROJECT_GID || '', known: Boolean(process.env.ASANA_TC_PROJECT_GID), secret: false, description: 'Optional Asana TC project id' },
  ];
}

export function createTCAccessService({
  accountManager,
  managedEnvService = null,
  logger = console,
} = {}) {
  async function getAccessReadiness() {
    const imapConfig = await resolveTCImapConfig({ accountManager, logger });
    const glvar = await accountManager?.getAccount?.('glvar_mls', GLVAR_ACCOUNT_ID);
    const expOkta = await accountManager?.getAccount?.('exp_okta', DEFAULT_EXP_EMAIL);

    const env = [
      normalizeEnvEntry('TC_IMAP_HOST', process.env.TC_IMAP_HOST || process.env.IMAP_HOST || '', 'IMAP host for TC mailbox'),
      normalizeEnvEntry('TC_IMAP_PORT', process.env.TC_IMAP_PORT || process.env.IMAP_PORT || '', 'IMAP port for TC mailbox'),
      normalizeEnvEntry('TC_IMAP_USER', process.env.TC_IMAP_USER || process.env.TC_IMAP_EMAIL || process.env.IMAP_USER || process.env.WORK_EMAIL || '', 'Mailbox address TC scanner will read'),
      normalizeEnvEntry('TC_IMAP_APP_PASSWORD', process.env.TC_IMAP_APP_PASSWORD || process.env.WORK_EMAIL_APP_PASSWORD || process.env.IMAP_PASS || '', 'IMAP app password', true),
      normalizeEnvEntry('WORK_EMAIL', process.env.WORK_EMAIL || '', 'Primary work email for alerts and fallback mailbox identity'),
      normalizeEnvEntry('TC_EMAIL_FROM', process.env.TC_EMAIL_FROM || process.env.EMAIL_FROM || '', 'From-address for TC communications'),
      normalizeEnvEntry('TC_AGENT_NAME', process.env.TC_AGENT_NAME || '', 'Agent/TC display name'),
      normalizeEnvEntry('TC_AGENT_PHONE', process.env.TC_AGENT_PHONE || '', 'Outbound TC contact phone'),
      normalizeEnvEntry('EMAIL_WEBHOOK_SECRET', process.env.EMAIL_WEBHOOK_SECRET || '', 'Inbound email webhook secret', true),
      normalizeEnvEntry('TWILIO_WEBHOOK_SECRET', process.env.TWILIO_WEBHOOK_SECRET || '', 'Inbound Twilio webhook secret', true),
      normalizeEnvEntry('ASANA_ACCESS_TOKEN', process.env.ASANA_ACCESS_TOKEN || '', 'Optional Asana sync token', true),
      normalizeEnvEntry('ASANA_TC_PROJECT_GID', process.env.ASANA_TC_PROJECT_GID || '', 'Optional Asana project for TC sync'),
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
        description: 'GLVAR/TransactionDesk Clareity credentials',
        present: Boolean(glvar?.password && (glvar?.username || glvar?.emailUsed)),
      },
      {
        service: 'exp_okta',
        key: DEFAULT_EXP_EMAIL,
        description: 'eXp Okta credential for SkySlope/BoldTrail SSO',
        present: Boolean(expOkta?.password && (expOkta?.username || expOkta?.emailUsed)),
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
        TC_IMAP_HOST: process.env.TC_IMAP_HOST || process.env.IMAP_HOST || 'imap.gmail.com',
        TC_IMAP_PORT: process.env.TC_IMAP_PORT || process.env.IMAP_PORT || '993',
        TC_AGENT_NAME: process.env.TC_AGENT_NAME || 'Adam Hopkins',
        TC_EMAIL_FROM: process.env.TC_EMAIL_FROM || process.env.WORK_EMAIL || '',
      },
      env_template: buildEnvTemplate(),
      remaining_blockers: [
        ...(!readiness.imap_ready ? ['TC email access is not fully configured'] : []),
        ...(!readiness.glvar_ready ? ['GLVAR Clareity credentials are not stored in the vault'] : []),
        ...(!readiness.skyslope_ready ? ['eXp Okta credentials are not stored in the vault'] : []),
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
      TC_IMAP_HOST: process.env.TC_IMAP_HOST || process.env.IMAP_HOST || 'imap.gmail.com',
      TC_IMAP_PORT: process.env.TC_IMAP_PORT || process.env.IMAP_PORT || '993',
      TC_IMAP_USER: tcImapUser || workEmail || process.env.TC_IMAP_USER || process.env.WORK_EMAIL || '',
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
    if (imapPassword && (tcImapUser || workEmail || process.env.TC_IMAP_USER || process.env.WORK_EMAIL)) {
      const emailUsed = tcImapUser || workEmail || process.env.TC_IMAP_USER || process.env.WORK_EMAIL;
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
    const template = buildEnvTemplate({ workEmail, tcImapUser, tcAgentName, tcAgentPhone, tcEmailFrom });
    const varsToStore = Object.fromEntries(
      template
        .filter((item) => item.known && !item.secret && String(item.value || '').trim())
        .map((item) => [item.name, item.value])
    );

    let managedEnv = null;
    if (managedEnvService && Object.keys(varsToStore).length) {
      const stored = await managedEnvService.upsertDesiredVars(varsToStore, actor);
      const sync = await managedEnvService.syncDesiredVars({ actor, names: Object.keys(varsToStore) }).catch((error) => ({ ok: false, error: error.message }));
      managedEnv = { stored, sync };
    }

    return {
      ok: true,
      seeded_names: Object.keys(varsToStore),
      pending_secret_names: template.filter((item) => item.secret && !item.known).map((item) => item.name),
      env_template: template,
      managed_env: managedEnv,
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
