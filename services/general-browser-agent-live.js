/**
 * SYNOPSIS: @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
// @ssot docs/products/tc-service/PRODUCT_HOME.md
import { runBrowserGoal } from './general-browser-agent.js';
import { observePage, makeDecider, makeEvidenceVerifier, makeAccountConfirmer, executeAction } from './general-browser-agent-runtime.js';

export async function runGoalOnSession({ 
    session, 
    goal, 
    startUrl = null, 
    callModel, 
    tiers = ['cerebras_llama', 'openai', 'claude_sonnet'], 
    mustContain = [], 
    mustHaveSelector = [], 
    expectSiteHost = null, 
    expectAccountText = null, 
    maxSteps = 20, 
    onScreenshot = null,
    onAfterStep = null,
    logger = console 
}) {
    const observe = async () => observePage(session);
    const decideAction = makeDecider({ callModel, tiers });
    const act = async (action) => executeAction(session, action);
    const verifyGoal = makeEvidenceVerifier({ mustContain, mustHaveSelector });
    const confirmContext = expectSiteHost || expectAccountText ? makeAccountConfirmer({ expectSiteHost, expectAccountText }) : null;
    const expectedContext = expectSiteHost || expectAccountText ? { site: expectSiteHost, account: expectAccountText } : null;

    const onStep = async (rec) => {
        try {
            if (session.screenshot) {
                const shot = await session.screenshot('step-' + (rec.step ?? 'x')).catch(() => null);
                if (typeof onScreenshot === 'function') {
                    await onScreenshot({ step: rec.step, action: rec.action, screenshot: shot });
                }
            }
        } catch (e) {
            // Guard against any errors in onStep
        }
    };

    return await runBrowserGoal({ 
        goal, 
        startUrl, 
        expectedContext, 
        observe, 
        decideAction, 
        act, 
        verifyGoal, 
        confirmContext, 
        onStep,
        onAfterStep,
        maxSteps 
    });
}
