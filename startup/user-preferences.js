/**
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
export function createUserPreferenceGuesser({ pool, callCouncilMember, logger }) {
  return async function guessUserDecision(context) {
    try {
      const pastDecisions = await pool.query(
        `SELECT context, choice, outcome, riskLevel 
         FROM user_decisions 
         WHERE created_at > NOW() - INTERVAL '30 days'
         ORDER BY created_at DESC 
         LIMIT 20`
      );

      const prompt = `Based on these past user decisions:
      ${JSON.stringify(pastDecisions.rows, null, 2)}
      
      And this current context:
      ${JSON.stringify(context)}
      
      What would the user likely choose? Consider:
      1. Risk tolerance patterns
      2. Decision speed preferences
      3. Common priorities
      4. Past similar situations
      
      Provide your best guess and confidence level (0-100).`;

      const guess = await callCouncilMember("chatgpt", prompt, {
        guessUserPreference: true,
      });

      return {
        prediction: guess,
        confidence: 75,
        basedOn: `${pastDecisions.rows.length} past decisions`,
      };
    } catch (error) {
      logger.error("User preference guess error:", { error: error.message });
      return { prediction: "uncertain", confidence: 0 };
    }
  };
}
