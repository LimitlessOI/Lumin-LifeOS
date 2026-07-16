/**
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Service module — Marketing Adam Decisions.
 */
const openDecisions = [
  { id: 'pricing-lead', question: 'Who is the pricing lead?' },
  { id: 'first-vertical', question: 'Which vertical do we target first?' },
  { id: 'creator-media-os-relationship', question: 'What is the Creator Media OS relationship to MarketingOS?' },
  { id: 'phase5-publisher', question: 'Who is the Phase 5 publisher partner?' },
  { id: 'phase0-intake-form', question: 'What is the Phase 0 intake form design?' },
  { id: 'new-decision-1', question: 'What is the new decision 1?' },
  { id: 'new-decision-2', question: 'What is the new decision 2?' },
  { id: 'new-decision-3', question: 'What is the new decision 3?' },
  { id: 'new-decision-4', question: 'What is the new decision 4?' },
  { id: 'new-decision-5', question: 'What is the new decision 5?' }
];

function getOpenDecisions() {
  return openDecisions;
}

async function recordDecision(id, decision, db) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS marketing_adam_decisions (
      id text PRIMARY KEY,
      question text,
      decision text,
      decided_at timestamptz DEFAULT now(),
      created_at timestamptz DEFAULT now()
    )
  `;
  await db.query(createTableQuery);

  const upsertQuery = `
    INSERT INTO marketing_adam_decisions (id, question, decision)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO UPDATE SET decision = $3, decided_at = now()
  `;
  const decisionQuestion = openDecisions.find(item => item.id === id)?.question;
  if (decisionQuestion) {
    await db.query(upsertQuery, [id, decisionQuestion, decision]);
  } else {
    throw new Error('Invalid decision id');
  }
}

async function processAdamDecisions(decisions, db) {
  for (const decision of decisions) {
    const { id, decisionText } = decision;
    if (openDecisions.some(item => item.id === id)) {
      await recordDecision(id, decisionText, db);
    } else {
      throw new Error(`Decision id ${id} is not recognized`);
    }
  }
}

async function resolveDecisions(decisions, db) {
  try {
    await processAdamDecisions(decisions, db);
  } catch (error) {
    console.error('Failed to resolve decisions:', error);
  }
}

export { getOpenDecisions, recordDecision, processAdamDecisions, resolveDecisions as resolveDecisions };
