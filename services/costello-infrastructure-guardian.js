const RAILWAY_GQL = 'https://backboard.railway.com/graphql/v2';

export const COSTELLO_SERVICE_NAME = process.env.COSTELLO_RAILWAY_SERVICE_NAME || 'costello-builderos';
export const COSTELLO_REPO = process.env.COSTELLO_GITHUB_REPO || 'LimitlessOI/Lumin-LifeOS-BuilderOS-B';
const CHECK_INTERVAL_MS = Number(process.env.COSTELLO_INFRA_GUARDIAN_INTERVAL_MS || 2 * 60 * 1000);
const DEPLOY_COOLDOWN_MS = Number(process.env.COSTELLO_INFRA_DEPLOY_COOLDOWN_MS || 5 * 60 * 1000);
const ALERT_REPEAT_MS = Number(process.env.COSTELLO_FIVE_ALARM_REPEAT_MS || 10 * 60 * 1000);
const RECEIPT_REL = 'products/receipts/COSTELLO_INFRA_GUARDIAN.json';
const RECEIPT_BRANCH = 'runtime-receipts';

const state = {
  armed: false,
  serviceId: null,
  domain: null,
  lastTickAt: null,
  lastHealthyAt: null,
  lastDeployAt: null,
  lastProvisionAt: null,
  lastError: null,
  lastStatus: null,
  incidentOpen: false,
  incidentStartedAt: null,
  lastAlertAt: null,
  lastAlertResult: null,
};

const RUNTIME_VAR_ALLOWLIST = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'GITHUB_TOKEN',
  'COMMAND_CENTER_KEY',
  'LIFEOS_KEY',
  'API_KEY',
  'RAILWAY_TOKEN',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'ALERT_PHONE',
  'ADAM_SMS_NUMBER',
];

function env(name) {
  return String(process.env[name] || '').trim();
}

function safeStateReceipt(extra = {}) {
  return {
    schema: 'costello_infrastructure_guardian_receipt_v1',
    system: 'costello',
    guardian: 'abbott_external_failure_domain',
    at: new Date().toISOString(),
    armed: state.armed,
    service_id: state.serviceId,
    service_name: COSTELLO_SERVICE_NAME,
    repository: COSTELLO_REPO,
    domain: state.domain,
    last_tick_at: state.lastTickAt,
    last_healthy_at: state.lastHealthyAt,
    last_deploy_at: state.lastDeployAt,
    last_provision_at: state.lastProvisionAt,
    incident_open: state.incidentOpen,
    incident_started_at: state.incidentStartedAt,
    last_error: state.lastError,
    last_status: state.lastStatus,
    last_alert: state.lastAlertResult ? {
      at: state.lastAlertAt,
      sms_requested: state.lastAlertResult.sms_requested,
      sms_accepted: state.lastAlertResult.sms_accepted,
      voice_requested: state.lastAlertResult.voice_requested,
      voice_accepted: state.lastAlertResult.voice_accepted,
      transport_configured: state.lastAlertResult.transport_configured,
    } : null,
    terminal_stop_forbidden: true,
    recovery_closes_only_on_manufacturing_proof: true,
    ...extra,
  };
}

async function persistReceipt(commitToGitHub, extra = {}, logger = console) {
  if (typeof commitToGitHub !== 'function') return false;
  const content = `${JSON.stringify(safeStateReceipt(extra), null, 2)}\n`;
  try {
    await commitToGitHub(
      RECEIPT_REL,
      content,
      `Costello infrastructure guardian ${state.incidentOpen ? 'incident' : 'status'} ${state.serviceId || 'unresolved'}`,
      RECEIPT_BRANCH,
    );
    return true;
  } catch (error) {
    logger?.warn?.({ error: error.message }, '[COSTELLO-INFRA] durable guardian receipt failed');
    return false;
  }
}

async function railwayGql(query, variables = {}) {
  const token = env('RAILWAY_TOKEN');
  if (!token) throw new Error('RAILWAY_TOKEN missing on Abbott runtime');
  const res = await fetch(RAILWAY_GQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`Railway non-JSON ${res.status}: ${text.slice(0, 300)}`); }
  if (!res.ok) throw new Error(`Railway HTTP ${res.status}: ${text.slice(0, 300)}`);
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

async function projectTopology(projectId) {
  const data = await railwayGql(`
    query CostelloTopology($id: String!) {
      project(id: $id) {
        id
        name
        services { edges { node { id name } } }
        environments { edges { node { id name } } }
      }
    }
  `, { id: projectId });
  return data?.project || null;
}

async function createCostelloService(projectId) {
  const data = await railwayGql(`
    mutation CreateCostello($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id name }
    }
  `, {
    input: {
      projectId,
      name: COSTELLO_SERVICE_NAME,
      source: { repo: COSTELLO_REPO },
    },
  });
  return data?.serviceCreate || null;
}

async function sourceVariableNames(projectId, environmentId, serviceId) {
  if (!serviceId) return [];
  const data = await railwayGql(`
    query AbbottVariables($projectId: String!, $environmentId: String!, $serviceId: String) {
      variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
    }
  `, { projectId, environmentId, serviceId });
  return Object.keys(data?.variables || {});
}

async function upsertVariables({ projectId, environmentId, serviceId, variables, skipDeploys = true }) {
  if (!serviceId || !variables || Object.keys(variables).length === 0) return;
  await railwayGql(`
    mutation GuardianVariables($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `, {
    input: { projectId, environmentId, serviceId, variables, skipDeploys },
  });
}

async function configureCostelloVariables({ projectId, environmentId, serviceId, sourceServiceName, sourceServiceId }) {
  const sourceNames = new Set(await sourceVariableNames(projectId, environmentId, sourceServiceId));
  const variables = {
    NODE_ENV: 'production',
    GITHUB_REPO: COSTELLO_REPO,
    GITHUB_DEPLOY_BRANCH: 'main',
    BUILDEROS_AUTOPILOT: '1',
    BUILDEROS_NEVER_STOP: '1',
    COSTELLO_INFRA_GUARDIAN: '1',
  };

  for (const name of RUNTIME_VAR_ALLOWLIST) {
    if (sourceNames.has(name) && sourceServiceName) variables[name] = `\${{${sourceServiceName}.${name}}}`;
  }

  await upsertVariables({ projectId, environmentId, serviceId, variables });
}

async function persistCostelloDomain({ projectId, environmentId, sourceServiceId, domain }) {
  if (!domain || !sourceServiceId) return;
  await upsertVariables({
    projectId,
    environmentId,
    serviceId: sourceServiceId,
    variables: { COSTELLO_PUBLIC_DOMAIN: domain },
    skipDeploys: true,
  });
}

async function ensureServiceDomain({ projectId, environmentId, serviceId, sourceServiceId }) {
  if (state.domain) return state.domain;
  const configured = env('COSTELLO_PUBLIC_DOMAIN').replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (configured) {
    state.domain = configured;
    return state.domain;
  }
  const data = await railwayGql(`
    mutation CostelloDomain($input: ServiceDomainCreateInput!) {
      serviceDomainCreate(input: $input) { domain }
    }
  `, { input: { serviceId, environmentId } });
  state.domain = data?.serviceDomainCreate?.domain || null;
  if (state.domain) await persistCostelloDomain({ projectId, environmentId, sourceServiceId, domain: state.domain });
  return state.domain;
}

async function setCostelloPublicUrl({ projectId, environmentId, serviceId, domain }) {
  if (!domain) return;
  const base = `https://${domain}`;
  await upsertVariables({
    projectId,
    environmentId,
    serviceId,
    variables: { PUBLIC_BASE_URL: base, APP_URL: base },
    skipDeploys: true,
  });
}

async function deployCostello(serviceId, environmentId) {
  const data = await railwayGql(`
    mutation DeployCostello($serviceId: String!, $environmentId: String!) {
      serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
    }
  `, { serviceId, environmentId });
  state.lastDeployAt = new Date().toISOString();
  return data?.serviceInstanceDeploy || null;
}

async function probeManufacturing(domain) {
  if (!domain) return { ok: false, reason: 'NO_COSTELLO_DOMAIN' };
  const url = `https://${domain}/api/v1/runtime/costello/build-status`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const body = await response.json().catch(() => null);
    const healthy = response.ok && body?.catastrophic_failure === false && body?.manufacturing_proven === true;
    return {
      ok: healthy,
      http_status: response.status,
      catastrophic_failure: body?.catastrophic_failure ?? null,
      manufacturing_proven: body?.manufacturing_proven ?? null,
      point_b_open: body?.point_b_open ?? null,
      point_b_reached: body?.point_b_reached ?? null,
      failure_reasons: body?.failure_reasons || [],
      latest_slice: body?.progress?.latest_slice || null,
      at: body?.at || new Date().toISOString(),
    };
  } catch (error) {
    return { ok: false, reason: 'UNREACHABLE', error: error.message };
  }
}

async function twilioPost(resource, params) {
  const sid = env('TWILIO_ACCOUNT_SID');
  const token = env('TWILIO_AUTH_TOKEN');
  if (!sid || !token) return { ok: false, configured: false };
  const body = new URLSearchParams(params);
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/${resource}.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  return { ok: response.ok, configured: true, status: response.status };
}

async function sendFiveAlarm(reason, logger = console) {
  const from = env('TWILIO_PHONE_NUMBER');
  const to = env('ALERT_PHONE') || env('ADAM_SMS_NUMBER');
  const transportConfigured = Boolean(env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && from && to);
  const message = `FIVE-ALARM BUILDEROS FAILURE: Costello autonomous manufacturing is stopped. ${reason}. Abbott external Sentry is actively recovering it now. Incident remains OPEN until fresh lawful manufacturing is proven.`;
  let sms = { ok: false, configured: transportConfigured };
  let voice = { ok: false, configured: transportConfigured };
  if (transportConfigured) {
    try {
      sms = await twilioPost('Messages', { From: from, To: to, Body: message });
    } catch (error) {
      logger?.error?.({ error: error.message }, '[COSTELLO-INFRA] five-alarm SMS failed');
    }
    try {
      voice = await twilioPost('Calls', {
        From: from,
        To: to,
        Twiml: `<Response><Say>${message.replace(/[<&]/g, '')}</Say></Response>`,
      });
    } catch (error) {
      logger?.error?.({ error: error.message }, '[COSTELLO-INFRA] five-alarm voice call failed');
    }
  }
  state.lastAlertAt = new Date().toISOString();
  state.lastAlertResult = {
    transport_configured: transportConfigured,
    sms_requested: transportConfigured,
    sms_accepted: sms.ok === true,
    voice_requested: transportConfigured,
    voice_accepted: voice.ok === true,
  };
  logger?.error?.({ reason, alert: state.lastAlertResult }, '[COSTELLO-INFRA] five-alarm founder alert processed');
  return state.lastAlertResult;
}

async function handleIncident(status, logger) {
  const reason = status?.reason || (status?.failure_reasons || []).join(',') || 'manufacturing_not_proven';
  if (!state.incidentOpen) {
    state.incidentOpen = true;
    state.incidentStartedAt = new Date().toISOString();
  }
  const alertAge = state.lastAlertAt ? Date.now() - Date.parse(state.lastAlertAt) : Infinity;
  if (!state.lastAlertAt || alertAge >= ALERT_REPEAT_MS) await sendFiveAlarm(reason, logger);
}

function clearIncidentIfRecovered(status, logger) {
  if (!status?.ok || !state.incidentOpen) return;
  logger?.info?.({ latest_slice: status.latest_slice }, '[COSTELLO-INFRA] Costello manufacturing recovery proven; closing P0 incident');
  state.incidentOpen = false;
  state.incidentStartedAt = null;
}

export async function ensureCostelloInfrastructure({ logger = console, forceDeploy = false, commitToGitHub = null } = {}) {
  state.lastTickAt = new Date().toISOString();
  const projectId = env('RAILWAY_PROJECT_ID');
  const environmentId = env('RAILWAY_ENVIRONMENT_ID');
  const sourceServiceId = env('RAILWAY_SERVICE_ID');
  const sourceServiceName = env('RAILWAY_SERVICE_NAME') || 'lumin-web';
  if (!projectId || !environmentId || !sourceServiceId) {
    state.lastError = 'Abbott Railway identity incomplete';
    await handleIncident({ reason: state.lastError }, logger);
    await persistReceipt(commitToGitHub, { phase: 'identity_failed' }, logger);
    return { ok: false, error: state.lastError };
  }

  try {
    const topology = await projectTopology(projectId);
    if (!topology) throw new Error('Abbott Railway project not accessible');
    let service = (topology.services?.edges || []).map((e) => e.node).find((s) => s?.name === COSTELLO_SERVICE_NAME) || null;
    let created = false;
    if (!service) {
      service = await createCostelloService(projectId);
      created = true;
      state.lastProvisionAt = new Date().toISOString();
      logger?.error?.({ service_id: service?.id, repo: COSTELLO_REPO }, '[COSTELLO-INFRA] provisioned missing independent Railway service');
    }
    if (!service?.id) throw new Error('Costello service creation/resolution returned no service id');
    state.serviceId = service.id;

    await configureCostelloVariables({ projectId, environmentId, serviceId: service.id, sourceServiceName, sourceServiceId });
    const domain = await ensureServiceDomain({ projectId, environmentId, serviceId: service.id, sourceServiceId });
    await setCostelloPublicUrl({ projectId, environmentId, serviceId: service.id, domain });

    let status = await probeManufacturing(domain);
    const deployAge = state.lastDeployAt ? Date.now() - Date.parse(state.lastDeployAt) : Infinity;
    if (forceDeploy || created || (!status.ok && deployAge >= DEPLOY_COOLDOWN_MS)) {
      await handleIncident(status, logger);
      await deployCostello(service.id, environmentId);
      logger?.error?.({ service_id: service.id, domain, reason: status.reason || status.failure_reasons }, '[COSTELLO-INFRA] forced Costello deployment/recovery');
      status = { ...status, recovery_deploy_triggered: true };
    } else if (!status.ok) {
      await handleIncident(status, logger);
    }

    state.lastStatus = status;
    if (status.ok) {
      state.lastHealthyAt = new Date().toISOString();
      state.lastError = null;
      clearIncidentIfRecovered(status, logger);
    } else {
      state.lastError = status.reason || (status.failure_reasons || []).join(',') || 'manufacturing_not_proven';
    }

    await persistReceipt(commitToGitHub, { phase: status.ok ? 'healthy' : 'recovering', provisioned_this_tick: created }, logger);
    return { ok: status.ok, provisioned: created, service_id: service.id, service_name: COSTELLO_SERVICE_NAME, domain, status };
  } catch (error) {
    state.lastError = error.message;
    await handleIncident({ reason: error.message }, logger);
    await persistReceipt(commitToGitHub, { phase: 'guardian_error' }, logger);
    logger?.error?.({ error: error.message }, '[COSTELLO-INFRA] guardian tick failed');
    return { ok: false, error: error.message };
  }
}

export function getCostelloInfrastructureGuardianStatus() {
  return { ...state, serviceName: COSTELLO_SERVICE_NAME, repository: COSTELLO_REPO, intervalMs: CHECK_INTERVAL_MS, external_to_costello_process: true };
}

export function startCostelloInfrastructureGuardian({ logger = console, commitToGitHub = null } = {}) {
  if (state.armed) return null;
  state.armed = true;
  const tick = () => ensureCostelloInfrastructure({ logger, commitToGitHub }).catch((error) => {
    state.lastError = error.message;
    logger?.error?.({ error: error.message }, '[COSTELLO-INFRA] unhandled guardian failure');
  });
  const boot = setTimeout(tick, Number(process.env.COSTELLO_INFRA_BOOT_DELAY_MS || 20_000));
  boot.unref?.();
  const timer = setInterval(tick, CHECK_INTERVAL_MS);
  timer.unref?.();
  logger?.info?.({ interval_ms: CHECK_INTERVAL_MS, target: COSTELLO_SERVICE_NAME }, '[COSTELLO-INFRA] Abbott-side guardian armed');
  return { boot, timer };
}

export default startCostelloInfrastructureGuardian;
