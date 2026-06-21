/**
 * SYNOPSIS: layer1,
 * Founder Debrief generator — Layer 1 synopsis + Layer 2 pack from session bundle.
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */

function gradeLine(grade, why) {
  if (!grade) return '| (pending) | — | Awaiting outcome |';
  return `| ${grade} | ${why || 'See evidence'} |`;
}

/**
 * @param {object} bundle — from getSessionBundle()
 */
export function formatFounderDebrief(bundle) {
  const {
    session_id,
    roster,
    hist_cases = [],
    cfo_receipts = [],
    consensus_sessions = [],
    scorecard_entries = [],
    gate,
  } = bundle;

  const latestConsensus = consensus_sessions[0] || null;
  const latestHist = hist_cases[0] || null;
  const totalCost = cfo_receipts.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  const totalTokens = cfo_receipts.reduce((s, r) => s + (Number(r.tokens) || 0), 0);
  const decision =
    latestConsensus?.final_synthesis ||
    latestHist?.case_text?.slice(0, 200) ||
    'No consensus recorded yet — review session evidence.';

  const layer1 = `# Founder Debrief — Synopsis

**Session:** \`${session_id}\`  
**Generated:** ${new Date().toISOString()}

## 1. What changed
- **Project:** ${roster?.project_slug || '—'}
- **Objective:** ${roster?.objective_id || '—'}
- **Departments involved:** ${(roster?.authorities || []).join(', ') || '—'}
- **REPs loaded:** ${(roster?.reps || []).map((r) => r.name || r).join(', ') || '—'}
- **Roster expanded after audit:** ${roster?.audit_expanded_roster ? 'Yes' : 'No'}${roster?.expand_reason ? ` — ${roster.expand_reason}` : ''}

## 2. What we decided (one sentence)
${decision}

## 3. Grades (A–F)
| Item | Grade | One-line why |
|------|-------|--------------|
${gradeLine(latestConsensus?.grade, latestConsensus?.predicted_outcome)}
| Deliberation gate | ${gate?.gate_status === 'PASS' ? 'A' : gate ? 'F' : '—'} | ${gate?.gate_status || 'Not run'} |

## 4. Money & speed (plain terms)
- **Models used:** ${(roster?.models || []).map((m) => m.id || m.model || m.focus).join(', ') || '—'}
- **Partial (lean) roster:** ${roster?.partial !== false ? 'Yes' : 'No'}
- **Founder priority mode:** ${roster?.founder_priority_mode ? 'Yes — spend not blocked' : 'No — normal stewardship'}
- **Recorded cost:** $${totalCost.toFixed(4)} · **Tokens:** ${totalTokens || 'not logged'}
- **CFO note:** ${totalCost > 0 ? 'Spend recorded; ROI judged by outcomes later.' : 'Lean run — minimal or unlogged cost.'}

## 5. What you need to decide
${gate?.gate_status === 'FAIL' ? `- Gate failed: ${(gate.violations || []).join(', ')} — review before build continues` : '- **None** — unless you want to override a council verdict'}

## 6. What's next
- ${roster?.objective_id ? `Continue objective \`${roster.objective_id}\`` : 'Pick next build slice from scorecard'}
- Run \`POST /api/v1/lifeos/deliberation/gate/pass\` if gate not yet passed
`;

  const layer2 = `# Founder Debrief — Full Pack

**Session:** \`${session_id}\`

## 7. Sessions run
\`\`\`json
${JSON.stringify(
  {
    authorities: roster?.authorities,
    reps: roster?.reps,
    models: roster?.models,
    partial: roster?.partial,
    roster_used: roster?.roster_used,
    audit_expanded_roster: roster?.audit_expanded_roster,
    expand_reason: roster?.expand_reason,
  },
  null,
  2
)}
\`\`\`

## 8. Debate summary
${latestConsensus
  ? `**Positions:** ${JSON.stringify(latestConsensus.original_positions || [])}\n\n**Vote counts:** ${JSON.stringify(latestConsensus.vote_counts || {})}`
  : '_No consensus session on file._'}

## 9. Future-back (1y · 2y · 4y · 5y)
${JSON.stringify(latestConsensus?.future_back_horizons || {}, null, 2)}

## 10. Competitive / external scan
${JSON.stringify(latestConsensus?.competitive_scan || [], null, 2)}

## 11. Brainstorm
${(latestConsensus?.brainstorm_ids || []).length ? `Ideas: ${latestConsensus.brainstorm_ids.join(', ')}` : '_No brainstorm IDs linked._'}

## 12. Synthesis path
- **position_e_or_k_found:** ${latestConsensus?.position_e_or_k_found ? 'yes' : 'no'}
- **final_synthesis:** ${latestConsensus?.final_synthesis || '—'}

## 13. Historian case (mandatory)
${latestHist ? `**Problem:** ${latestHist.problem || '—'}\n\n**Case:** ${latestHist.case_text}\n\n**Opportunity:** ${latestHist.opportunity || '—'}` : '_Missing — process failure if load-bearing._'}

## 14. CFO receipts (${cfo_receipts.length})
${cfo_receipts.map((r) => `- ${r.dept}/${r.role} model=${r.model} cost=$${r.cost_usd ?? '?'} tokens=${r.tokens ?? '?'}`).join('\n') || '_None_'}

## 15. Scorecard entries
${scorecard_entries.map((s) => `- ${s.decision_type}: grade=${s.outcome_grade || 'pending'} cost=$${s.cost_usd ?? '?'}`).join('\n') || '_None_'}

## 16. Evidence / rollback
- Gate record: ${gate?.gate_status || 'PENDING'}
- Violations: ${JSON.stringify(gate?.violations || [])}
- Session ID for audit: \`${session_id}\`
`;

  return {
    session_id,
    layer1_synopsis: layer1,
    layer2_full: layer2,
    markdown: `${layer1}\n\n---\n\n${layer2}`,
  };
}
