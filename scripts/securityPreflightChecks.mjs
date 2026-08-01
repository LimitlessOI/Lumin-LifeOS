/**
 * SYNOPSIS: Conducts preflight security checks focusing on P0 items.
 * @ssot docs/products/oil-security-divisions/PRODUCT_HOME.md
 */
import { execSync } from 'child_process';

/**
 * Checks for known vulnerable packages using `npm audit`.
 * @returns {boolean} True if no critical or high vulnerabilities are found, false otherwise.
 */
function checkForVulnerablePackages() {
  try {
    // npm audit will exit with a non-zero code if vulnerabilities are found
    // We're specifically interested in critical and high severity
    execSync('npm audit --json --audit-level=high', { stdio: 'pipe' });
    return true; // No high or critical vulnerabilities found
  } catch (error) {
    const output = error.stdout.toString();
    try {
      const auditResult = JSON.parse(output);
      const advisories = auditResult.advisories;
      if (advisories && Object.keys(advisories).length > 0) {
        return false; // Vulnerabilities found
      }
    } catch (parseError) {
      // Fallback if npm audit output is not valid JSON
      if (output.includes('found 0 vulnerabilities')) {
        return true;
      }
    }
    return false; // Assume failure if there's an error or unexpected output
  }
}

// Check for open ports
function checkOpenPorts() {
  // Example check: ensure no unauthorized ports are open
  try {
    const result = execSync('netstat -tuln').toString();
    const unauthorizedPorts = [8080, 3000]; // Example unauthorized ports
    return !unauthorizedPorts.some(port => result.includes(`:${port} `));
  } catch (error) {
    return false;
  }
}

/**
 * Runs a series of preflight security checks for P0 items.
 * @param {object} options - Options object (currently unused).
 * @returns {Promise<object>} A structured result of the security checks.
 */
export async function runPreflightChecks(options = {}) {
  const securityChecks = {
    vulnerablePackages: checkForVulnerablePackages(),
    openPorts: checkOpenPorts(),
    // Add more P0 checks here
  };

  const failedChecks = Object.entries(securityChecks).filter(([, status]) => !status);

  return {
    approach: 'Automated analysis of system configuration and dependencies.',
    pros: [
      'Automates critical security checks.',
      'Provides immediate feedback on P0 vulnerabilities.',
      'Reduces manual effort for pre-deployment security assessments.',
    ],
    cons: [
      'Limited to checks that can be automated via system commands or dependency analysis.',
      'May not catch all types of security vulnerabilities (e.g., business logic flaws).',
      'Requires appropriate permissions to execute system commands.',
    ],
    recommendation: failedChecks.length === 0
      ? 'All P0 security preflight checks passed. System appears secure for deployment.'
      : `Failed P0 security preflight checks: ${failedChecks.map(([check]) => check).join(', ')}. Immediate action required.`,
    results: securityChecks,
  };
}