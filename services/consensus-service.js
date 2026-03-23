/**
 * consensus-service.js — extracted from server.js
 * conductEnhancedConsensus and createProposal helpers.
 *
 * Use createConsensusService(deps) to get bound functions.
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

/**
 * @param {object} deps
 * @param {object}   deps.pool
 * @param {function} deps.detectBlindSpots
 * @param {object}   deps.COUNCIL_MEMBERS
 * @param {function} deps.callCouncilMember
 * @param {function} deps.guessUserDecision
 * @param {function} deps.sandboxTest
 * @param {object}   deps.systemMetrics
 * @param {function} deps.trackLoss
 * @param {function} deps.broadcastToAll
 */
export function createConsensusService(deps) {
  const {
    pool,
    detectBlindSpots,
    COUNCIL_MEMBERS,
    callCouncilMember,
    guessUserDecision,
    sandboxTest,
    systemMetrics,
    trackLoss,
    broadcastToAll,
  } = deps;

  // --------------------------------------------------------------------------
  // conductEnhancedConsensus
  // --------------------------------------------------------------------------
  async function conductEnhancedConsensus(proposalId) {
    try {
      const propResult = await pool.query(
        `SELECT title, description FROM consensus_proposals WHERE proposal_id = $1`,
        [proposalId]
      );

      if (!propResult.rows.length) {
        return { ok: false, error: "Proposal not found" };
      }

      const { title, description } = propResult.rows[0];

      const blindSpots = await detectBlindSpots(title, { description });

      const consequencePrompt = `Evaluate this proposal for consequences:
    Title: ${title}
    Description: ${description}

    List:
    1. Intended positive consequences
    2. Potential unintended negative consequences
    3. Mitigation strategies for negative consequences
    4. Overall risk assessment (low/medium/high)`;

      const members = Object.keys(COUNCIL_MEMBERS);
      let yesVotes = 0,
        noVotes = 0,
        abstainVotes = 0;
      const consequences = [];
      let activeMembers = 0;

      for (const member of members) {
        try {
          const consequenceResponse = await callCouncilMember(
            member,
            consequencePrompt
          );

          activeMembers++;

          const riskMatch = consequenceResponse.match(
            /risk.*?(low|medium|high)/i
          );
          const riskLevel = riskMatch ? riskMatch[1] : "medium";

          await pool.query(
            `INSERT INTO consequence_evaluations (proposal_id, ai_member, risk_level, unintended_consequences)
             VALUES ($1, $2, $3, $4)`,
            [
              proposalId,
              member,
              riskLevel,
              consequenceResponse.slice(0, 1000),
            ]
          );

          consequences.push({ member, risk: riskLevel });

          const votePrompt = `Vote on this proposal with awareness of these blind spots and consequences:
        ${title}

        Blind spots detected: ${blindSpots.slice(0, 3).join(", ")}
        Risk level: ${riskLevel}

        Vote: YES/NO/ABSTAIN
        Reasoning: [brief explanation considering all factors]`;

          const voteResponse = await callCouncilMember(member, votePrompt);
          const voteMatch = voteResponse.match(
            /VOTE:\s*(YES|NO|ABSTAIN|Yes|No|Abstain)/i
          );
          const reasonMatch = voteResponse.match(
            /REASONING:\s*([\s\S]*?)$/i
          );

          const vote = voteMatch ? voteMatch[1].toUpperCase() : "ABSTAIN";
          const reasoning = reasonMatch
            ? reasonMatch[1].trim().slice(0, 500)
            : "";

          if (vote === "YES") yesVotes++;
          else if (vote === "NO") noVotes++;
          else abstainVotes++;

          await pool.query(
            `INSERT INTO consensus_votes (proposal_id, ai_member, vote, reasoning)
             VALUES ($1, $2, $3, $4)`,
            [proposalId, member, vote, reasoning]
          );
        } catch (error) {
          console.log(`⚠️ ${member} unavailable for voting: ${error.message}`);
          abstainVotes++;
          continue;
        }
      }

      if (activeMembers === 0) {
        return { ok: false, error: "No AI council members available" };
      }

      const userPreference = await guessUserDecision({
        proposal: title,
        description,
      });

      let sandboxResult = null;
      if (description.includes("code") || description.includes("implement")) {
        sandboxResult = await sandboxTest(
          `console.log("Testing proposal: ${title}");`,
          title
        );
      }

      const totalVotes = yesVotes + noVotes;
      const approvalRate = totalVotes > 0 ? yesVotes / totalVotes : 0;
      const hasHighRisk = consequences.some((c) => c.risk === "high");
      const sandboxPassed = sandboxResult ? sandboxResult.success : true;

      const approvalThreshold =
        activeMembers <= 2 ? 0.5 : hasHighRisk ? 0.8 : 0.6667;

      const approved = approvalRate >= approvalThreshold && sandboxPassed;

      let decision = "REJECTED";
      if (approved) decision = "APPROVED";
      else if (approvalRate >= 0.5) decision = "NEEDS_MODIFICATION";

      await pool.query(
        `UPDATE consensus_proposals SET status = $2, decided_at = now() WHERE proposal_id = $1`,
        [proposalId, decision]
      );

      systemMetrics.consensusDecisionsMade++;

      return {
        ok: true,
        proposalId,
        yesVotes,
        noVotes,
        abstainVotes,
        activeMembers,
        approvalRate: (approvalRate * 100).toFixed(1) + "%",
        decision,
        blindSpots: blindSpots.length,
        riskAssessment: hasHighRisk ? "HIGH" : "MODERATE",
        userPreference: userPreference.prediction,
        sandboxTest: sandboxResult,
        message: `Decision: ${decision} (${yesVotes}/${totalVotes} votes from ${activeMembers} active members)`,
      };
    } catch (error) {
      console.error("Enhanced consensus error:", error.message);
      await trackLoss("error", "Enhanced consensus failed", error.message);
      return { ok: false, error: error.message };
    }
  }

  // --------------------------------------------------------------------------
  // createProposal
  // --------------------------------------------------------------------------
  async function createProposal(title, description, proposedBy = "system") {
    try {
      const proposalId = `prop_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      await pool.query(
        `INSERT INTO consensus_proposals (proposal_id, title, description, proposed_by, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [proposalId, title, description, proposedBy, "proposed"]
      );
      broadcastToAll({ type: "proposal_created", proposalId, title });
      return proposalId;
    } catch (error) {
      console.error("Proposal creation error:", error.message);
      return null;
    }
  }

  return { conductEnhancedConsensus, createProposal };
}

// ==================== COUNCIL CONSENSUS (getCouncilConsensus) ====================
// Extracted from server.js. Requires { callCouncilMember, COUNCIL_MEMBERS, OLLAMA_ENDPOINT } at call time.

/**
 * Compare two responses for similarity (word overlap)
 */
export function compareResponses(a, b) {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.length / Math.max(union.size, 1);
}

/**
 * Select best response from multiple responses (highest average similarity)
 */
export function selectBestResponse(responses) {
  if (responses.length === 0) return null;
  if (responses.length === 1) return responses[0].response;

  const scores = responses.map((r1, i) => {
    let totalSimilarity = 0;
    let count = 0;
    for (let j = 0; j < responses.length; j++) {
      if (i !== j) {
        totalSimilarity += compareResponses(r1.response, responses[j].response);
        count++;
      }
    }
    return {
      response: r1.response,
      model: r1.model,
      avgSimilarity: count > 0 ? totalSimilarity / count : 0,
    };
  });

  scores.sort((a, b) => b.avgSimilarity - a.avgSimilarity);
  console.log(`📊 [CONSENSUS] Best response from ${scores[0].model} (avg similarity: ${(scores[0].avgSimilarity * 100).toFixed(0)}%)`);
  return scores[0].response;
}

/**
 * Factory — returns getCouncilConsensus bound to the provided deps.
 * @param {{ callCouncilMember: function, COUNCIL_MEMBERS: object, OLLAMA_ENDPOINT: string }} deps
 */
export function createGetCouncilConsensus({ callCouncilMember, COUNCIL_MEMBERS, OLLAMA_ENDPOINT }) {
  return async function getCouncilConsensus(prompt, taskType = 'code') {
    console.log('🤝 [COUNCIL CONSENSUS] Getting multiple opinions for code decision...');

    const models = ['ollama_deepseek_coder', 'ollama_qwen_coder_32b', 'ollama_llama', 'ollama_deepseek'];
    const availableModels = models.filter(m => COUNCIL_MEMBERS[m] && (OLLAMA_ENDPOINT || COUNCIL_MEMBERS[m].provider === 'groq'));

    if (availableModels.length < 2) {
      console.warn('⚠️ [CONSENSUS] Not enough models available, using single model');
      if (availableModels.length > 0) {
        return await callCouncilMember(availableModels[0], prompt);
      }
      return await callCouncilMember('ollama_deepseek', prompt);
    }

    const responses = [];

    for (const model of availableModels.slice(0, 2)) {
      try {
        console.log(`🔄 [CONSENSUS] Getting opinion from ${model}...`);
        const response = await callCouncilMember(model, prompt, {
          useOpenSourceCouncil: true,
          maxTokens: 8000,
          temperature: 0.3,
        });
        if (response) {
          responses.push({ model, response });
          console.log(`✅ [CONSENSUS] ${model} responded (${response.length} chars)`);
        }
      } catch (e) {
        console.warn(`⚠️ [CONSENSUS] ${model} failed: ${e.message}`);
      }
    }

    if (responses.length < 2) {
      console.warn('⚠️ [CONSENSUS] Not enough responses, using single model result');
      return responses[0]?.response || null;
    }

    const similarity = compareResponses(responses[0].response, responses[1].response);
    console.log(`📊 [CONSENSUS] Similarity: ${(similarity * 100).toFixed(0)}%`);

    if (similarity > 0.7) {
      console.log(`✅ [CONSENSUS] Models agree (similarity: ${(similarity * 100).toFixed(0)}%)`);
      return responses[0].response;
    }

    console.log('🔄 [CONSENSUS] Models disagree, getting 3rd opinion...');
    try {
      const tiebreakerModel = availableModels[2] || availableModels[0];
      const tiebreaker = await callCouncilMember(tiebreakerModel, prompt, {
        useOpenSourceCouncil: true,
        maxTokens: 8000,
        temperature: 0.3,
      });
      responses.push({ model: tiebreakerModel, response: tiebreaker });

      const bestResponse = selectBestResponse(responses);
      console.log(`✅ [CONSENSUS] Selected best response after tiebreaker`);
      return bestResponse;
    } catch (e) {
      console.warn(`⚠️ [CONSENSUS] Tiebreaker failed: ${e.message}, using first response`);
      return responses[0].response;
    }
  };
}
