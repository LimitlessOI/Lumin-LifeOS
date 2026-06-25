/**
 * SYNOPSIS: When to attach product/strategic brief vs pure personal Lumin reply.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { isFounderPersonalLifeIntent } from './founder-life-admin-intent.js';
import { hasProductBuildContext } from './chair-context-classifier.js';

const PRODUCT_STRATEGY_MARKERS = /\b(lifere|point b|alpha|revenue|competitor|roadmap|ship|deploy|builder|ssot|north star|product|strategy|monetize)\b/i;

export function isPersonalLuminDomain(chairContext = {}) {
  const domain = chairContext.domain || '';
  if (['personal_life', 'conversation', 'counsel', 'life_admin'].includes(domain)) return true;
  if (domain === 'dual' && chairContext.personal_search) return true;
  return Boolean(chairContext.personal_search);
}

export function shouldAttachStrategicBrief(cleanedInput = '', chairContext = {}) {
  if (isPersonalLuminDomain(chairContext)) return false;
  if (isFounderPersonalLifeIntent(cleanedInput) && !hasProductBuildContext(cleanedInput)) return false;
  if (PRODUCT_STRATEGY_MARKERS.test(cleanedInput)) return true;
  if (['product_build', 'governance', 'system_ops'].includes(chairContext.domain)) return true;
  return false;
}

export function shouldUsePersonalLuminCard(truth = {}) {
  return truth.action === 'lumin'
    && (isPersonalLuminDomain(truth.chair_context || {}) || truth.chair_domain === 'personal_life' || truth.chair_domain === 'conversation');
}
