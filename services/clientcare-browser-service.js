/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * clientcare-browser-service.js
 * Browser-first fallback contract for ClientCare when API access is unavailable.
 */

const REQUIRED_BROWSER_SECRETS = [
  'CLIENTCARE_BASE_URL',
  'CLIENTCARE_USERNAME',
  'CLIENTCARE_PASSWORD',
];

const OPTIONAL_BROWSER_SECRETS = [
  'CLIENTCARE_MFA_MODE',
  'CLIENTCARE_MFA_SECRET',
];

const WORKFLOW_TEMPLATES = [
  {
    id: 'claim-aging-export',
    title: 'Export claim aging report',
    goal: 'Get the full unpaid and aging inventory into the rescue queue.',
    steps: [
      'Log into ClientCare West billing area.',
      'Open claim aging or accounts receivable report.',
      'Filter for unpaid or outstanding claims.',
      'Export CSV or spreadsheet.',
      'Upload the export into LifeOS billing rescue import.',
    ],
  },
  {
    id: 'rejected-claims-export',
    title: 'Export rejected claims',
    goal: 'Identify claims that can often be corrected and resubmitted quickly.',
    steps: [
      'Open rejected claims or clearinghouse errors view.',
      'Export all open rejected items.',
      'Include rejection reason and original submission date if available.',
      'Import into rescue queue.',
    ],
  },
  {
    id: 'denied-claims-export',
    title: 'Export denied claims',
    goal: 'Separate correctable denials from late or likely-dead balances.',
    steps: [
      'Open denied claims report.',
      'Export denial code, denial reason, payer, date of service, billed amount, and paid amount.',
      'Import into rescue queue.',
    ],
  },
  {
    id: 'unbilled-encounters-export',
    title: 'Export unbilled encounters',
    goal: 'Catch work performed but never converted into submitted claims.',
    steps: [
      'Open unbilled encounters, superbills, or pending claims list.',
      'Export all rows with DOS, patient, payer, codes, and charge amount.',
      'Import into rescue queue.',
    ],
  },
];

export function createClientCareBrowserService({ env = process.env } = {}) {
  function getReadiness() {
    const configured = [];
    const missing = [];
    for (const key of REQUIRED_BROWSER_SECRETS) {
      if (env[key]) configured.push(key);
      else missing.push(key);
    }
    const optionalConfigured = OPTIONAL_BROWSER_SECRETS.filter((key) => !!env[key]);
    return {
      mode: 'browser_fallback',
      ready: missing.length === 0,
      requiredSecrets: REQUIRED_BROWSER_SECRETS,
      optionalSecrets: OPTIONAL_BROWSER_SECRETS,
      configuredSecrets: configured,
      missingSecrets: missing,
      optionalConfigured,
      workflowTemplates: WORKFLOW_TEMPLATES,
      notes: [
        'Do not store ClientCare credentials in code or docs.',
        'Use Railway secrets or the encrypted account vault only if browser automation is confirmed necessary.',
        'Selectors and automation steps should be finalized only after a live walkthrough of the ClientCare billing screens.',
      ],
    };
  }

  return {
    getReadiness,
    listWorkflowTemplates: () => WORKFLOW_TEMPLATES,
  };
}
