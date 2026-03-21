import { requireKey } from "../../src/server/auth/requireKey.js";
import {
  aiSafetyGate,
  validateProofBundle,
  REQUIRED_PROOF_TYPES_FOR_CRITICAL,
} from "../../services/ai-guard.js";

export class CouncilModule {
  constructor({
    pool,
    callCouncilMember,
    callCouncilWithFailover,
    pingCouncilMember,
    detectBlindSpots,
    handleSelfProgramming,
    getDailySpend,
    executionQueue,
    decodeMicroBody,
    buildMicroResponse,
    compressPrompt,
  } = {}) {
    this.pool = pool;
    this.callCouncilMember = callCouncilMember;
    this.callCouncilWithFailover = callCouncilWithFailover;
    this.pingCouncilMember = pingCouncilMember;
    this.detectBlindSpots = detectBlindSpots;
    this.handleSelfProgramming = handleSelfProgramming;
    this.getDailySpend = getDailySpend;
    this.executionQueue = executionQueue;
    this.decodeMicroBody = decodeMicroBody;
    this.buildMicroResponse = buildMicroResponse;
    this.compressPrompt = compressPrompt;

    this.routes = [
      {
        path: "/api/v1/ai-council/test",
        method: "POST",
        middleware: [requireKey],
        handler: this.handleCouncilTest.bind(this),
      },
      {
        path: "/api/v1/chat",
        method: "POST",
        middleware: [requireKey, aiSafetyGate],
        handler: this.handleChat.bind(this),
      },
      {
        path: "/api/council/chat",
        method: "POST",
        middleware: [requireKey, aiSafetyGate],
        handler: this.handleMicroCouncil.bind(this),
      },
      {
        path: "/api/v1/architect/chat",
        method: "POST",
        middleware: [requireKey, aiSafetyGate],
        handler: this.handleArchitectChat.bind(this),
      },
      {
        path: "/api/v1/architect/command",
        method: "POST",
        middleware: [requireKey, aiSafetyGate],
        handler: this.handleArchitectCommand.bind(this),
      },
      {
        path: "/api/v1/architect/micro",
        method: "POST",
        middleware: [requireKey, aiSafetyGate],
        handler: this.handleArchitectMicro.bind(this),
      },
    ];
  }

  async handleCouncilTest(req, res) {
    try {
      console.log("🧪 [TEST] Testing AI Council communication...");
      const testPrompt = "Respond with exactly: 'AI_COUNCIL_TEST_SUCCESS' followed by your name. This is a communication test.";
      const testResults = [];
      const members = ["chatgpt", "gemini", "deepseek", "grok"];

      for (const member of members) {
        try {
          const startTime = Date.now();
          const response = await this.callCouncilMember(member, testPrompt, { useCache: false });
          const duration = Date.now() - startTime;
          const success = response.includes("AI_COUNCIL_TEST_SUCCESS") || response.length > 10;

          testResults.push({
            member,
            success,
            response: response.substring(0, 200),
            duration,
            timestamp: new Date().toISOString(),
          });

          console.log(`✅ [TEST] ${member}: ${success ? "SUCCESS" : "PARTIAL"} (${duration}ms)`);
        } catch (error) {
          testResults.push({
            member,
            success: false,
            error: error.message,
            duration: 0,
            timestamp: new Date().toISOString(),
          });
          console.error(`❌ [TEST] ${member}: FAILED - ${error.message}`);
        }
      }

      const successCount = testResults.filter((r) => r.success).length;
      const totalCount = testResults.length;
      const allSuccess = successCount === totalCount;

      res.json({
        ok: true,
        test: "ai_council_communication",
        results: testResults,
        summary: {
          total: totalCount,
          successful: successCount,
          failed: totalCount - successCount,
          allSuccess,
          successRate: `${Math.round((successCount / totalCount) * 100)}%`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Council test error:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleChat(req, res) {
    try {
      let body = req.body;

      if (typeof body === "string") {
        body = { message: body };
      } else if (!body || typeof body !== "object") {
        body = {};
      }

      const {
        message,
        member = "chatgpt",
        autoImplement = true,
        requireProofBundle = false,
        proofBundle,
      } = body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message required" });
      }

      if (requireProofBundle) {
        if (!proofBundle) {
          return res.status(400).json({
            error: "PROOF_BUNDLE_REQUIRED",
            message: "This request requires a valid proof bundle.",
          });
        }
        const proofValidation = validateProofBundle(proofBundle);
        if (!proofValidation.valid) {
          return res.status(400).json({
            error: proofValidation.error || "INVALID_PROOF_BUNDLE",
            message: proofValidation.message,
          });
        }
      }

      if (message.trim() === "ping" && autoImplement === false) {
        const pingResult = await this.pingCouncilMember(member);
        const ts = new Date().toISOString();
        if (!pingResult.ok) {
          return res.status(503).json({
            ok: false,
            member,
            mode: "ping",
            ts,
            error: pingResult.error || "unavailable",
            provider: pingResult.provider,
            endpoint: pingResult.endpoint,
            statusCode: pingResult.statusCode,
          });
        }
        return res.json({
          ok: true,
          member,
          mode: "ping",
          ts,
          provider: pingResult.provider,
          endpoint: pingResult.endpoint,
          statusCode: pingResult.statusCode,
        });
      }

      console.log(`🤖 [COUNCIL] ${member} processing: ${message.substring(0, 100)}...`);

      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        await this.pool.query(
          `INSERT INTO conversation_memory (memory_id, orchestrator_msg, ai_response, ai_member, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [conversationId, message, "pending", member]
        );
      } catch (dbError) {
        console.warn("⚠️ Could not store conversation:", dbError.message);
      }

      const blindSpots = await this.detectBlindSpots(message, {
        source: "user_chat",
      });

      const implementationRequest = /(?:add|create|implement|build|make|change|update|modify|fix|do|install|set up|configure|change this|add a|create a)/i.test(message);
      let response;
      let implementationStarted = false;

      if (implementationRequest && autoImplement) {
        console.log("🚀 [AUTO-IMPLEMENT] Detected implementation request, starting self-programming...");
        try {
          const selfProgResult = await this.handleSelfProgramming(
            {
              instruction: message,
              autoDeploy: true,
              priority: "high",
            },
            req
          );

          if (selfProgResult && selfProgResult.ok) {
            implementationStarted = true;
            response = `✅ **IMPLEMENTATION STARTED**\n\nI've automatically started implementing your request. The system is now:\n\n${selfProgResult.filesModified?.length ? `- Modifying ${selfProgResult.filesModified.length} file(s): ${selfProgResult.filesModified.join(", ")}\n` : ""}${selfProgResult.taskId ? `- Task ID: ${selfProgResult.taskId}\n` : ""}${selfProgResult.deployed ? `- ✅ Changes committed and deploying\n` : ""}\nThe changes will be deployed automatically. You can check the status via the health endpoint.\n\n**What I'm doing:** ${message}`;
          } else {
            console.warn("⚠️ Self-programming returned error, using chat:", selfProgResult?.error);
            response = await this.callCouncilMember(member, message);
          }
        } catch (implError) {
          console.warn("⚠️ Auto-implementation failed, falling back to chat:", implError.message);
          response = await this.callCouncilMember(member, message);
        }
      } else {
        response = await this.callCouncilMember(member, message);
      }

      try {
        await this.pool.query(
          `UPDATE conversation_memory SET ai_response = $1 WHERE memory_id = $2`,
          [response, conversationId]
        );
      } catch (dbError) {
        console.warn("⚠️ Could not update conversation:", dbError.message);
      }

      const spend = this.getDailySpend ? await this.getDailySpend() : null;
      const microSymbols = String(response).replace(/ /g, "~");

      const payload = {
        ok: true,
        response,
        symbols: microSymbols,
        spend,
        member,
        blindSpotsDetected: blindSpots.length,
        timestamp: new Date().toISOString(),
        implementationStarted,
        conversationId,
      };

      if (requireProofBundle) {
        payload.proofBundle = {
          validated: true,
          requiredTypes: REQUIRED_PROOF_TYPES_FOR_CRITICAL,
        };
      }

      res.json(payload);
    } catch (error) {
      console.error("Council chat error:", error);
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleMicroCouncil(req, res) {
    try {
      const decoded = this.decodeMicroBody(req.body);
      const { text, channel, meta, packet } = decoded;

      if (!text) {
        return res.status(400).json({ error: "Message text required" });
      }

      const member = meta?.member || packet?.m?.member || "chatgpt";
      const useCompression = meta?.compress !== false && text.length > 100;

      console.log(
        `🎼 [MICRO] ${member} in ${channel}: ${text.substring(0, 100)}...${useCompression ? " [COMPRESSED]" : ""}`
      );

      const blindSpots = await this.detectBlindSpots(text, {
        source: "micro_chat",
        channel,
        member,
      });

      const response = await this.callCouncilMember(member, text, { compress: useCompression });
      const spend = this.getDailySpend ? await this.getDailySpend() : null;

      const responsePacket = this.buildMicroResponse({
        text: response,
        channel,
        role: "a",
        meta: {
          member,
          spend,
          blindSpotsDetected: blindSpots.length,
          aiName: "LifeOS Council",
          timestamp: new Date().toISOString(),
        },
        compress: useCompression,
      });

      res.json(responsePacket);
    } catch (error) {
      console.error("Micro council chat error:", error);
      const errorPacket = this.buildMicroResponse({
        text: `Error: ${error.message}`,
        channel: "error",
        role: "a",
        meta: { error: true },
      });
      res.json(errorPacket);
    }
  }

  async handleArchitectChat(req, res) {
    try {
      const { query_json, original_message } = req.body;
      if (!query_json && !original_message) {
        return res.status(400).json({ error: "Query JSON or original message required" });
      }

      const prompt = query_json
        ? `Process this compressed query: ${JSON.stringify(query_json)}\n\nProvide detailed response.`
        : original_message;

      const response = await this.callCouncilWithFailover(prompt, "ollama_deepseek");
      const response_json = {
        r: response.slice(0, 500),
        ts: Date.now(),
        compressed: true,
      };

      res.json({
        ok: true,
        response_json,
        original_response: response,
        compressed: true,
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleArchitectCommand(req, res) {
    try {
      const { query_json, command, intent } = req.body;
      const override_human_review = req.body?.override_human_review === true;

      const prompt = `Command: ${command}\nIntent: ${intent}\nCompressed Query: ${JSON.stringify(query_json || {})}\n\nExecute this command and provide results (but do not directly move money or impersonate users).`;

      const response = await this.callCouncilWithFailover(prompt, "ollama_deepseek");

      if (intent && intent !== "general" && this.executionQueue) {
        await this.executionQueue.addTask(intent, command, { override_human_review });
      }

      res.json({
        ok: true,
        message: response,
        intent,
        queued: intent !== "general" && !!this.executionQueue,
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }

  async handleArchitectMicro(req, res) {
    try {
      const microQuery = req.body;

      if (typeof microQuery === "string" && microQuery.includes("|")) {
        const parts = microQuery.split("|");
        const operation = parts.find((p) => p.startsWith("OP:"))?.slice(3) || "G";
        const data = parts
          .find((p) => p.startsWith("D:"))
          ?.slice(2)
          .replace(/~/g, " ") || "";

        const compressed = this.compressPrompt(data, true);
        const aiResponse = await this.callCouncilWithFailover(
          `Process this ${compressed.format === "LCTPv3" ? "compressed" : ""} request: ${compressed.compressed}`,
          "deepseek",
          { compress: true }
        );

        let response;
        switch (operation) {
          case "G":
            response = `CT:${aiResponse}~completed~result:success~compression:${Math.round((1 - compressed.ratio) * 100)}%`;
            break;
          case "A":
            response = `CT:${aiResponse}~complete~insights:generated~compression:${Math.round((1 - compressed.ratio) * 100)}%`;
            break;
          default:
            response = `CT:${aiResponse}~processed~status:done`;
        }

        res.send(response);
      } else {
        const response = await this.callCouncilWithFailover(microQuery, "deepseek", { compress: true });
        res.send(`CT:${String(response).replace(/ /g, "~")}`);
      }
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  }
}
