/**
 * SYNOPSIS: Separate verifiable facts from inferences, assumptions, and judgments.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

export function splitKnowledgeAndJudgment(input = '') {
  const text = String(input);
  const facts = [];
  const judgments = [];
  const unknowns = [];

  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  for (const sentence of sentences) {
    const s = sentence.trim();
    if (s.startsWith('I think') || s.startsWith('I believe') || s.startsWith('It seems') || s.includes('probably') || s.includes('likely') || s.includes('maybe')) {
      judgments.push(s);
    } else if (s.includes('unknown') || s.includes('not sure') || s.includes('?')) {
      unknowns.push(s);
    } else if (s.length > 0) {
      facts.push(s);
    }
  }

  return {
    facts,
    judgments,
    unknowns,
    confidence: facts.length / (facts.length + judgments.length + unknowns.length || 1),
  };
}

export function tagOutput(output = {}) {
  if (typeof output === 'string') {
    return { ...splitKnowledgeAndJudgment(output), raw: output };
  }
  return {
    ...splitKnowledgeAndJudgment(output?.summary || output?.text || JSON.stringify(output)),
    raw: output,
  };
}
