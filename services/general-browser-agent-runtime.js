/**
 * SYNOPSIS: Exports observePage — services/general-browser-agent-runtime.js.
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */

export async function observePage(session, opts = {}) {
    try {
        const url = await session.currentUrl() || session.page.url();
        const title = await session.page.title();
        const text = (await session.pageText()).substring(0, opts.maxTextChars || 4000);
        const elements = await session.page.evaluate((maxElements) => {
            const interactiveElements = [...document.querySelectorAll('a, button, input, select, textarea, [role=button]')];
            return interactiveElements.filter(el => el.offsetParent !== null).slice(0, maxElements).map((el) => {
                const tag = el.tagName.toLowerCase();
                const type = el.type || '';
                const name = el.name || '';
                const id = el.id || '';
                const text = (el.innerText || el.placeholder || el.value || el.getAttribute('aria-label') || '').trim().substring(0, 80);
                const selector = id ? `#${id}` : `${tag}:nth-of-type(${Array.from(el.parentNode.children).indexOf(el) + 1})`;
                return { tag, type, name, id, text, selector };
            });
        }, opts.maxElements || 40);
        return { url, title, text, elements };
    } catch {
        return { url: '', title: '', text: '', elements: [] };
    }
}

export function formatObservation(observation, goal, opts = {}) {
    const elementsList = observation.elements.map((el, index) => `${index + 1}. <${el.tag}>: ${el.text} (selector: ${el.selector})`).join('\n');
    const stuckNote = opts.stuck
        ? `\n\nWARNING: your last action produced NO visible change to this page (same URL, same title, same elements as before). Do NOT repeat that exact action again. Pick a genuinely different element, scroll to reveal more of the page, or try a different navigation path entirely.`
        : '';
    return `Goal: ${goal}\nURL: ${observation.url}\nTitle: ${observation.title}\nText: ${observation.text.substring(0, 1500)}\nElements:\n${elementsList}${stuckNote}`;
}

export function parseModelAction(text) {
    const regex = /{[^]*?}/;
    const match = text.match(regex);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch {
            return { type: 'give_up', reason: 'unparseable_model_output' };
        }
    }
    return { type: 'give_up', reason: 'unparseable_model_output' };
}

export function makeDecider({ callModel, tiers }) {
    return async function decideAction({ goal, observation, history, stuck = false, stuckCount = 0 }) {
        const prompt = formatObservation(observation, goal, { stuck }) + '\nPlease respond ONLY with a JSON action of the form {"type":"navigate|click|type|wait|done|give_up", ...fields}';
        // Escalate: a decision the cheap tiers already got wrong twice deserves the
        // strongest available model, not another cheap guess -- same escalation
        // philosophy as SO-003, triggered by observed difficulty instead of only
        // pre-set. Generic: no site-specific tier names, just "try tiers in reverse
        // (strongest-presumed-last -> first) when meaningfully stuck."
        const effectiveTiers = stuck && stuckCount >= 2 && tiers.length > 1
            ? [...tiers].reverse()
            : tiers;
        for (const tier of effectiveTiers) {
            try {
                const output = await callModel(tier, prompt);
                if (output) {
                    return parseModelAction(output);
                }
            } catch {}
        }
        return { type: 'give_up', reason: 'all_tiers_failed' };
    };
}

export function makeEvidenceVerifier({ mustContain = [], mustHaveSelector = [] }) {
    return async function verifyGoal({ goal, observation }) {
        const matchedText = mustContain.filter(text => observation.text.toLowerCase().includes(text.toLowerCase()));
        const matchedSelectors = mustHaveSelector.filter(selector => observation.elements.some(el => el.selector === selector || el.text.toLowerCase().includes(selector.toLowerCase())));
        const reached = matchedText.length === mustContain.length && matchedSelectors.length === mustHaveSelector.length;
        return { reached, evidence: { matchedText, matchedSelectors, url: observation.url } };
    };
}

export function makeAccountConfirmer({ expectSiteHost = null, expectAccountText = null }) {
    // Google's own login page (accounts.google.com) is a legitimate intermediate
    // step for ANY google.com property's login flow (Gmail, Drive, etc.) -- found
    // live 2026-08-10: a real GMAIL_SIGNUP run failed context_unconfirmed:
    // context_mismatch the instant it hit Google's login redirect, before ever
    // reaching the email/password fields, because only the single expected host
    // was trusted.
    const isGoogleHost = Boolean(expectSiteHost) && /(^|\.)google\.com$/.test(expectSiteHost);
    const trustedHosts = expectSiteHost ? [expectSiteHost, ...(isGoogleHost ? ['accounts.google.com'] : [])] : [];

    return async function confirmContext({ observation, action = null }) {
        // Allow first navigate TO the expected host from about:blank / other pages.
        if (
            action?.type === 'navigate' &&
            expectSiteHost &&
            typeof action.url === 'string' &&
            action.url.includes(expectSiteHost)
        ) {
            return { ok: true };
        }
        const url = String(observation?.url || '');
        const hostOk = trustedHosts.length === 0 || trustedHosts.some((h) => url.includes(h));
        const ok =
            hostOk &&
            (expectAccountText === null || String(observation?.text || '').includes(expectAccountText));
        return { ok, reason: ok ? undefined : 'context_mismatch' };
    };
}

export async function executeAction(session, action) {
    try {
        switch (action.type) {
            case 'navigate':
                await session.navigate(action.url);
                break;
            case 'click':
                await session.click(action.selector);
                break;
            case 'type':
                await session.fill(action.selector, action.text);
                break;
            case 'wait':
                await new Promise(r => setTimeout(r, Math.min(action.ms || 1000, 5000)));
                break;
            case 'done':
            case 'give_up':
                return { ok: true, noop: true };
            default:
                return { ok: false, error: 'unknown_action_type' };
        }
        return { ok: true };
    } catch (error) {
        return { ok: false, error: error?.message || String(error) };
    }
}