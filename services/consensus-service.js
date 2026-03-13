/**
 * consensus-service.js — extracted from server.js
 * conductEnhancedConsensus and createProposal helpers.
 *
 * Use createConsensusService(deps) to get bound functions.
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
