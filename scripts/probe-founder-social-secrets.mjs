/**
 * SYNOPSIS: Probe tip for founder social/Wix secret NAMES present (never print values).
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
const tip = process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app';
const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';

const NAMES = [
  'ADAM_FACEBOOK_EMAIL',
  'ADAMS_FACEBOOK_PASSWORD',
  'ADAM_FACEBOOK_PASSWORD',
  'FACEBOOK_EMAIL',
  'FACEBOOK_PASSWORD',
  'WRM_WIX_EMAIL',
  'WRM_WIX_PASSWORD',
  'WIX_EMAIL',
  'WIX_PASSWORD',
  'WRM_DOMAIN',
  'WORK_EMAIL',
  'GMAIL_SIGNUP_EMAIL',
];

async function main() {
  // Prefer env inventory if mounted; else local process only.
  let inventory = null;
  if (key) {
    try {
      const res = await fetch(`${tip}/api/v1/railway/managed-env/status`, {
        headers: { 'x-command-key': key },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) inventory = await res.json().catch(() => null);
    } catch {
      inventory = null;
    }
  }

  const presentLocal = {};
  for (const n of NAMES) presentLocal[n] = Boolean(process.env[n]);

  const report = {
    ok: true,
    tip,
    note: 'Values never printed — present/absent only',
    namingConvention: '{WHO}_{CHANNEL}_EMAIL / {WHO}_{CHANNEL}_PASSWORD (e.g. ADAM_FACEBOOK_*)',
    localProcess: presentLocal,
    tipManagedEnvStatusHttp: inventory ? 'ok' : 'unavailable_or_no_key',
    tipHint: inventory?.ok != null ? { ok: inventory.ok, keys: Object.keys(inventory).slice(0, 20) } : null,
    ready: {
      adamFacebook: presentLocal.ADAM_FACEBOOK_EMAIL && (presentLocal.ADAMS_FACEBOOK_PASSWORD || presentLocal.ADAM_FACEBOOK_PASSWORD || presentLocal.FACEBOOK_PASSWORD),
      wrmWix: (presentLocal.WRM_WIX_EMAIL || presentLocal.WIX_EMAIL) && (presentLocal.WRM_WIX_PASSWORD || presentLocal.WIX_PASSWORD),
    },
    next: 'After Railway deploy finishes, secrets are on the service — ask conductor to cut over WRM / start FB approve-pack ops. Local probe only sees vars if exported in this shell.',
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e.message }));
  process.exit(1);
});