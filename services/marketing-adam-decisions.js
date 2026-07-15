/**
 * SYNOPSIS: Service module — Marketing Adam Decisions.
 */
const openDecisions = [
  { id: 'pricing-lead', question: 'Who is the pricing lead?' },
  { id: 'first-vertical', question: 'Which vertical do we target first?' },
  { id: 'creator-media-os-relationship', question: 'What is the Creator Media OS relationship to MarketingOS?' },
  { id: 'phase5-publisher', question: 'Who is the Phase 5 publisher partner?' },
  { id: 'phase0-intake-form', question: 'What is the Phase 0 intake form design?' }
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

export { getOpenDecisions, recordDecision };