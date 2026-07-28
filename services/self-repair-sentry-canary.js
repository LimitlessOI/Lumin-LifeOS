/**
 * SYNOPSIS: Exports runSentryCanary — services/self-repair-sentry-canary.js.
 */
import { runSingleAssertion } from '../factory-staging/factory-core/sentry/behavior-assertions.js';

export async function runSentryCanary({ readFileRunner } = {}) {
    const brokenAssertion = {
        type: 'exports_smoke',
        exports: ['__self_repair_canary_should_never_exist__']
    };

    const workingAssertion = {
        type: 'exports_smoke',
        exports: ['existingExport']
    };

    const injectBrokenModule = async () => {
        return {};
    };

    const injectWorkingModule = async () => {
        return { existingExport: true };
    };

    const brokenResult = await runSingleAssertion(brokenAssertion, { importModule: injectBrokenModule });
    const workingResult = await runSingleAssertion(workingAssertion, { importModule: injectWorkingModule });

    const canary_passed = brokenResult.ok === false && brokenResult.reason.startsWith('missing_exports') && workingResult.ok === true;

    return {
        ok: true,
        canary_passed,
        detail: {
            brokenResult,
            workingResult
        }
    };
}