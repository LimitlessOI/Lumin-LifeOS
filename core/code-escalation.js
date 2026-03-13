/**
 * code-escalation.js — extracted from server.js
 * Escalation strategy, robust sandbox testing, persistent council escalation,
 * code fix extraction and application helpers.
 *
 * Use createCodeEscalation(deps) to get a bound set of functions.
 */

/**
 * @param {object} deps
 * @param {function} deps.callCouncilWithFailover
 * @param {function} deps.callCouncilMember
 * @param {function} deps.sandboxTest
 * @param {object}   deps.pool
 * @param {object}   deps.COUNCIL_MEMBERS
 * @param {function} deps.getApiKeyForProvider
 * @param {function} deps.searchWebWithGemini
 * @param {function} deps.detectHallucinations
 * @param {function} deps.detectDrift
 * @param {function} deps.crossValidateResponses
 * @param {function} deps.validateAgainstWebSearch
 */
export function createCodeEscalation(deps) {
  const {
    callCouncilWithFailover,
    callCouncilMember,
    sandboxTest,
    pool,
    COUNCIL_MEMBERS,
    getApiKeyForProvider,
    searchWebWithGemini,
    detectHallucinations,
    detectDrift,
    crossValidateResponses,
    validateAgainstWebSearch,
  } = deps;

  // --------------------------------------------------------------------------
  // proposeEscalationStrategy
  // --------------------------------------------------------------------------
  async function proposeEscalationStrategy(problem, errorContext, attemptsSoFar = 0) {
    const strategyPrompt = `We have a persistent problem that needs solving:

PROBLEM: ${problem}
ERROR CONTEXT: ${errorContext}
ATTEMPTS SO FAR: ${attemptsSoFar}

Propose an escalation strategy with:
1. Number of attempts at each tier
2. Which AI members to involve at each tier
3. When to escalate to web search
4. Maximum total attempts before considering alternative approaches

Format your response as:
TIER 1: [description] - [X] attempts with [members]
TIER 2: [description] - [X] attempts with [members]
TIER 3: [description] - [X] attempts with [members]
WEB SEARCH: [description] - [X] attempts with [members]
MAX TOTAL: [X] attempts

Be strategic - we want to solve this, not waste resources.`;

    try {
      const strategy = await callCouncilWithFailover(strategyPrompt, "ollama_deepseek"); // Use Tier 0 (free)
      return {
        success: true,
        strategy,
        proposedBy: "council",
      };
    } catch (error) {
      // Default strategy if proposal fails
      return {
        success: false,
        strategy: `TIER 1: Single AI analysis - 3 attempts with first available member
TIER 2: Multiple AIs - 5 attempts with top 3 available members
TIER 3: Full council - 10 attempts with all available members
WEB SEARCH: Web research - 5 attempts with ALL available members (enhanced web search)
MAX TOTAL: 25 attempts`,
        proposedBy: "default",
      };
    }
  }

  // --------------------------------------------------------------------------
  // robustSandboxTest
  // --------------------------------------------------------------------------
  async function robustSandboxTest(code, testDescription, maxRetries = 5) {
    console.log(`🧪 [ROBUST TEST] Starting: ${testDescription}`);

    let result;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}...`);

      result = await sandboxTest(code, testDescription);

      if (result.success) {
        console.log(`✅ [ROBUST TEST] Success on attempt ${attempt}`);
        return { ...result, attempt, phase: "initial_retry" };
      }

      console.log(
        `⚠️ Attempt ${attempt} failed: ${
          result.error?.substring(0, 100) || "Unknown error"
        }`
      );

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.log(`🔍 [ROBUST TEST] Initial retries failed, escalating to persistent council...`);
    return await persistentCouncilEscalation(code, testDescription, result.error);
  }

  // --------------------------------------------------------------------------
  // persistentCouncilEscalation
  // --------------------------------------------------------------------------
  async function persistentCouncilEscalation(code, testDescription, errorContext = "") {
    console.log(`🏛️ [PERSISTENT ESCALATION] Problem: ${testDescription}`);
    console.log(`🔄 This will continue until solved...`);

    // Propose escalation strategy
    const strategyResult = await proposeEscalationStrategy(
      testDescription,
      errorContext || "Code failed sandbox testing",
      0
    );
    console.log(`📋 Escalation Strategy Proposed:\n${strategyResult.strategy}`);

    const proposalId = `persist_esc_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    try {
      await pool.query(
        `INSERT INTO consensus_proposals (proposal_id, title, description, proposed_by, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          proposalId,
          `Persistent Escalation: ${testDescription}`,
          `Working until solved. Strategy: ${strategyResult.strategy.substring(0, 200)}...`,
          "system",
          "in_progress",
        ]
      );
    } catch (err) {
      console.warn(`⚠️ Could not create proposal: ${err.message}`);
    }

    let totalAttempts = 0;
    let currentCode = code;
    let currentTier = 1;
    let tierAttempts = 0;
    const maxTierAttempts = 3; // Per tier before escalating
    const maxTotalAttempts = 50; // Absolute maximum (safety limit)

    // Get list of available working AIs
    const availableMembers = [];
    for (const member of Object.keys(COUNCIL_MEMBERS)) {
      try {
        // Quick check if member is available (check API key exists)
        const testKey = getApiKeyForProvider(COUNCIL_MEMBERS[member].provider);
        if (testKey) {
          availableMembers.push(member);
        }
      } catch {
        // Skip unavailable members
      }
    }

    console.log(`✅ Available AI members: ${availableMembers.join(", ")}`);

    // Tier definitions
    const tiers = [
      {
        name: "Single AI Analysis",
        members: availableMembers.length > 0 ? [availableMembers[0]] : ["deepseek"],
        maxAttempts: 3,
        description: "Deep analysis with one technical expert",
      },
      {
        name: "Multiple Technical AIs",
        members: availableMembers.length >= 3
          ? availableMembers.slice(0, 3)
          : ["chatgpt", "deepseek", "gemini"],
        maxAttempts: 5,
        description: "Collaborative analysis with technical experts",
      },
      {
        name: "Full Council",
        members: availableMembers.length > 0 ? availableMembers : ["chatgpt", "deepseek", "gemini", "grok"],
        maxAttempts: 10,
        description: "All council members working together",
      },
      {
        name: "Web Search Enhanced - All Available AIs",
        members: availableMembers.length > 0 ? availableMembers : ["chatgpt", "deepseek", "gemini", "grok"],
        maxAttempts: 5,
        description: "ALL available working AIs with web search capabilities",
        useWebSearch: true,
      },
    ];

    while (totalAttempts < maxTotalAttempts) {
      // Check if we need to escalate to next tier
      if (tierAttempts >= tiers[currentTier - 1].maxAttempts && currentTier < tiers.length) {
        console.log(`\n📈 ESCALATING to Tier ${currentTier + 1}: ${tiers[currentTier].name}`);
        currentTier++;
        tierAttempts = 0;
      }

      // If we've exhausted all tiers, continue with web search
      if (currentTier > tiers.length) {
        console.log(`\n🔄 All tiers exhausted. Continuing with web search focus...`);
        currentTier = tiers.length; // Stay on web search tier
      }

      const tier = tiers[currentTier - 1];
      totalAttempts++;
      tierAttempts++;

      console.log(
        `\n🏛️ [TIER ${currentTier}/${tiers.length}] ${tier.name} - Attempt ${tierAttempts}/${tier.maxAttempts} (Total: ${totalAttempts})`
      );

      const analysisPrompt = `We have a persistent problem that MUST be solved:

PROBLEM: ${testDescription}
ERROR: ${errorContext || "Code failed testing"}
TIER: ${tier.name}
ATTEMPT: ${tierAttempts}/${tier.maxAttempts} (Total: ${totalAttempts})

ORIGINAL CODE:
\`\`\`javascript
${currentCode}
\`\`\`

${tier.useWebSearch ? "🔍 WEB SEARCH MODE: Search the web, blogs, Stack Overflow, GitHub, and documentation for solutions to this exact problem. Include links and code examples from real solutions." : ""}

We need to:
1. Diagnose the root cause
2. ${tier.useWebSearch ? "Find web resources and examples" : "Analyze the code deeply"}
3. Propose corrected code
4. Ensure it will work

Provide:
1. Root cause analysis
2. ${tier.useWebSearch ? "Web resources found (with links if possible)" : "Technical analysis"}
3. Specific, complete code fix
4. Why this fix will work`;

      const insights = [];
      const fixes = [];
      const webSearchResults = {};

      // Call tier members with drift & hallucination protection
      for (const member of tier.members) {
        try {
          let prompt = analysisPrompt;

          // Add web search for ALL members in web search tier
          if (tier.useWebSearch) {
            if (member === "gemini") {
              const webResults = await searchWebWithGemini(
                `${testDescription}. Error: ${errorContext}`
              );
              webSearchResults.gemini = webResults;
              if (webResults.success) {
                prompt += `\n\n🔍 GEMINI WEB SEARCH RESULTS:\n${webResults.results}`;
              }
            } else {
              prompt += `\n\n🔍 WEB SEARCH MODE: Use your knowledge base and any available web-connected information to find solutions. Search for similar problems, Stack Overflow answers, GitHub issues, blog posts, and documentation. Include specific examples and code snippets from your knowledge.`;
            }
          }

          const response = await callCouncilMember(member, prompt);

          // DRIFT & HALLUCINATION PROTECTION
          const hallucinationCheck = await detectHallucinations(response, { problem: testDescription, tier: currentTier }, member);

          // Get historical responses for this member (if available)
          try {
            const historyResult = await pool.query(
              `SELECT response FROM conversation_memory
               WHERE ai_member = $1 AND created_at > NOW() - INTERVAL '24 hours'
               ORDER BY created_at DESC LIMIT 5`,
              [member]
            );
            const historicalResponses = historyResult.rows.map(r => r.response || "");
            const driftCheck = await detectDrift(member, response, historicalResponses);

            if (hallucinationCheck.confidence === "low" || driftCheck.hasDrift) {
              console.warn(`⚠️ [${member}] Hallucination/Drift detected:`, {
                hallucination: hallucinationCheck,
                drift: driftCheck,
              });
              insights.push({
                member,
                response,
                tier: currentTier,
                flagged: true,
                hallucinationCheck,
                driftCheck,
              });
            } else {
              insights.push({ member, response, tier: currentTier });
            }
          } catch (histErr) {
            // If history check fails, still include the response
            insights.push({ member, response, tier: currentTier });
          }

          // Validate against web search if available
          if (tier.useWebSearch && webSearchResults.gemini) {
            const webResult = webSearchResults.gemini;
            const webValidation = await validateAgainstWebSearch(response, webResult, testDescription);
            if (webValidation.confidence === "low") {
              console.warn(`⚠️ [${member}] Response may not align with web search:`, webValidation.reason);
            }
          }

          const memberFixes = extractCodeFixes(response);
          fixes.push(...memberFixes.map((f) => ({ source: member, fix: f, tier: currentTier })));
        } catch (err) {
          console.log(`⚠️ ${member} unavailable: ${err.message}`);
        }
      }

      // CROSS-VALIDATION: Check if multiple AIs agree
      if (insights.length >= 2) {
        const validation = await crossValidateResponses(insights, { problem: testDescription });
        if (!validation.validated || validation.confidence === "low") {
          console.warn(`⚠️ CROSS-VALIDATION FAILED:`, validation);
        } else {
          console.log(`✅ CROSS-VALIDATION PASSED: ${validation.reason}`);
        }
      }

      // If no fixes found, try to get more from other members
      if (fixes.length === 0 && currentTier < tiers.length) {
        console.log(`⚠️ No fixes found this round, escalating...`);
        currentTier++;
        tierAttempts = 0;
        continue;
      }

      console.log(`🧪 Testing ${fixes.length} proposed fix(es)...`);

      // Test each fix
      for (let i = 0; i < fixes.length; i++) {
        const fix = fixes[i];
        console.log(`🔧 Testing fix ${i + 1}/${fixes.length} from ${fix.source} (Tier ${fix.tier})...`);

        const testCode = applyCodeFix(currentCode, fix.fix);
        const testResult = await sandboxTest(testCode, testDescription);

        if (testResult.success) {
          console.log(`\n🎉 SUCCESS! Fix from ${fix.source} (Tier ${fix.tier}) worked after ${totalAttempts} total attempts!`);

          try {
            await pool.query(
              `UPDATE consensus_proposals SET status = 'resolved', decided_at = now()
               WHERE proposal_id = $1`,
              [proposalId]
            );

            await pool.query(
              `INSERT INTO sandbox_tests
               (test_id, code_change, test_result, success, error_message, created_at)
               VALUES ($1, $2, $3, $4, $5, now())`,
              [
                `success_${proposalId}`,
                `Applied fix from ${fix.source} (Tier ${fix.tier}): ${fix.fix.substring(0, 500)}`,
                `Persistent escalation successful after ${totalAttempts} attempts`,
                true,
                null,
              ]
            );
          } catch (dbErr) {
            console.warn(`⚠️ Database update failed: ${dbErr.message}`);
          }

          return {
            success: true,
            result: testResult.result,
            error: null,
            totalAttempts,
            tier: fix.tier,
            fixSource: fix.source,
            phase: "persistent_escalation_success",
            strategy: strategyResult.strategy,
          };
        }

        console.log(`⚠️ Fix ${i + 1} from ${fix.source} failed`);
      }

      // Update current code with best fix attempt for next iteration
      if (fixes.length > 0) {
        currentCode = applyCodeFix(currentCode, fixes[0].fix);
        console.log(`📝 Updated code baseline with best attempt for next iteration`);
      }

      console.log(`🔄 No fixes worked this round. Continuing...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // If we hit max attempts, don't give up - escalate to manual review
    console.log(`\n⚠️ Reached maximum attempts (${maxTotalAttempts}). Creating manual review proposal...`);

    try {
      await pool.query(
        `UPDATE consensus_proposals SET status = 'needs_review', description = description || ' - Reached max attempts, needs manual review'
         WHERE proposal_id = $1`,
        [proposalId]
      );
    } catch (err) {
      console.warn(`⚠️ Could not update proposal: ${err.message}`);
    }

    return {
      success: false,
      result: null,
      error: `Reached maximum attempts (${maxTotalAttempts}) without solving. Problem requires manual review or alternative approach.`,
      totalAttempts,
      phase: "max_attempts_reached",
      proposalId,
      strategy: strategyResult.strategy,
    };
  }

  // --------------------------------------------------------------------------
  // councilEscalatedSandboxTest (legacy alias)
  // --------------------------------------------------------------------------
  async function councilEscalatedSandboxTest(code, testDescription) {
    return await persistentCouncilEscalation(code, testDescription);
  }

  // --------------------------------------------------------------------------
  // extractCodeFixes
  // --------------------------------------------------------------------------
  function extractCodeFixes(response) {
    const fixes = [];

    const codeBlockRegex = /```(?:javascript|js)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeBlockRegex.exec(response)) !== null) {
      fixes.push(match[1].trim());
    }

    const fixPatterns = [
      /fix:?\s*\n?([\s\S]*?)(?=\n\n|\n\w|$)/gi,
      /solution:?\s*\n?([\s\S]*?)(?=\n\n|\n\w|$)/gi,
      /corrected code:?\s*\n?([\s\S]*?)(?=\n\n|\n\w|$)/gi,
      /try this:?\s*\n?([\s\S]*?)(?=\n\n|\n\w|$)/gi,
    ];

    for (const pattern of fixPatterns) {
      const matches = response.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          fixes.push(match[1].trim());
        }
      }
    }

    if (fixes.length === 0) {
      const lines = response.split("\n");
      let inCodeBlock = false;
      let currentFix = [];

      for (const line of lines) {
        if (
          line.includes("```") ||
          line.includes("fix") ||
          line.includes("function") ||
          line.includes("const ") ||
          line.includes("let ") ||
          line.includes("async")
        ) {
          inCodeBlock = true;
        }

        if (inCodeBlock) {
          currentFix.push(line);

          if (
            line.trim().endsWith(";") ||
            line.trim().endsWith("}") ||
            line.includes("// end")
          ) {
            if (currentFix.length > 2) {
              fixes.push(currentFix.join("\n"));
            }
            currentFix = [];
            inCodeBlock = false;
          }
        }
      }
    }

    return fixes;
  }

  // --------------------------------------------------------------------------
  // applyCodeFix
  // --------------------------------------------------------------------------
  function applyCodeFix(originalCode, fix) {
    if (fix.includes("function") && fix.includes("{") && fix.includes("}")) {
      return fix;
    }

    if (fix.includes("replace") && fix.includes("with")) {
      const replaceMatch = fix.match(
        /replace\s+['"`](.*?)['"`]\s+with\s+['"`](.*?)['"`]/i
      );
      if (replaceMatch) {
        const [, search, replacement] = replaceMatch;
        return originalCode.replace(new RegExp(search, "g"), replacement);
      }
    }

    return `${originalCode}\n\n// Applied fix\n${fix}`;
  }

  return {
    proposeEscalationStrategy,
    robustSandboxTest,
    persistentCouncilEscalation,
    councilEscalatedSandboxTest,
    extractCodeFixes,
    applyCodeFix,
  };
}
