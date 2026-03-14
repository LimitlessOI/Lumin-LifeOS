import crypto from "crypto";
import dayjs from "dayjs";

let expressApp = null;
const AI_GUARDED_ROUTES = new Set([
  "/api/v1/chat",
  "/api/council/chat",
  "/api/v1/architect/chat",
  "/api/v1/architect/command",
  "/api/v1/architect/micro",
  "/api/v1/system/self-program",
]);

const PROOF_TYPES = [
  "code_citation",
  "test_output",
  "runtime_check",
  "human_confirm",
];

const REQUIRED_PROOF_TYPES_FOR_CRITICAL = [
  "code_citation",
  "test_output",
  "runtime_check",
];

let expectedRealityHash = null;
let expectedRealitySetAt = null;
let expectedRealitySetBy = "system";

const HAB_DAILY_LIMIT = Number(process.env.HAB_DAILY_LIMIT ?? 10) || 10;
const habLedger = {};

let aiEnabled = true;
let aiStatusReason = "initialized";
let aiStatusUpdatedAt = new Date().toISOString();
let aiStatusUpdatedBy = "system";

export function configureAiGuard({ app, initialAiEnabled = true } = {}) {
  expressApp = app;
  aiEnabled = Boolean(initialAiEnabled);
  aiStatusReason = aiEnabled ? "enabled" : "disabled";
  aiStatusUpdatedAt = new Date().toISOString();
  aiStatusUpdatedBy = "system";
  ensureExpectedRealityHash();
}

export function getAiStatus() {
  return {
    aiEnabled,
    reason: aiStatusReason,
    updatedAt: aiStatusUpdatedAt,
    updatedBy: aiStatusUpdatedBy,
  };
}

export function setAiEnabled(value, reason, actor = "system") {
  aiEnabled = Boolean(value);
  aiStatusReason = reason || (aiEnabled ? "enabled" : "disabled");
  aiStatusUpdatedAt = new Date().toISOString();
  aiStatusUpdatedBy = actor || "system";
  return getAiStatus();
}

export function getActorLabel(req) {
  return (
    req.headers["x-command-actor"] ||
    req.headers["x-user-id"] ||
    "command-center"
  );
}

export function checkHumanAttentionBudget(req, res, next) {
  const commandKey = req.headers["x-command-key"];
  const today = dayjs().format("YYYY-MM-DD");
  if (!commandKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!habLedger[commandKey]) {
    habLedger[commandKey] = {};
  }

  const used = habLedger[commandKey][today] || 0;
  if (used >= HAB_DAILY_LIMIT) {
    return res.status(429).json({
      error: "HUMAN_ATTENTION_BUDGET_EXCEEDED",
      limit: HAB_DAILY_LIMIT,
      used,
      date: today,
    });
  }

  habLedger[commandKey][today] = used + 1;
  next();
}

export function validateProofBundle(bundle) {
  if (!Array.isArray(bundle)) {
    return {
      valid: false,
      error: "INVALID_PROOF_BUNDLE",
      message: "Proof bundle must be an array.",
    };
  }

  for (const proof of bundle) {
    if (!proof || typeof proof !== "object") {
      return {
        valid: false,
        error: "INVALID_PROOF_BUNDLE",
        message: "Each proof must be an object.",
      };
    }

    if (!proof.type || !PROOF_TYPES.includes(proof.type)) {
      return {
        valid: false,
        error: "INVALID_PROOF_BUNDLE",
        message: `Proof type must be one of ${PROOF_TYPES.join(", ")}.`,
      };
    }

    if (typeof proof.value === "undefined" || proof.value === null) {
      return {
        valid: false,
        error: "INVALID_PROOF_BUNDLE",
        message: "Each proof entry requires a value.",
      };
    }
  }

  return { valid: true };
}

function sanitizeLayerPath(source = "") {
  if (!source) {
    return "";
  }

  let cleaned = source.split("\\/").join("/");

  const tokensToStrip = ["\\", "^", "$", "(?:", "(?=", "|", ")", "?", "+", "[", "]"];

  for (const token of tokensToStrip) {
    if (!token) continue;
    cleaned = cleaned.split(token).join("");
  }

  while (cleaned.includes("//")) {
    cleaned = cleaned.split("//").join("/");
  }

  while (cleaned.endsWith("/")) {
    cleaned = cleaned.slice(0, -1);
  }

  cleaned = cleaned.trim();
  if (!cleaned || cleaned === "/") {
    return "";
  }

  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

function joinPaths(base, addition) {
  const normalize = (value) =>
    (value || "")
      .toString()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

  const baseClean = normalize(base);
  const additionClean = normalize(addition);

  if (!baseClean && !additionClean) {
    return "/";
  }

  if (!baseClean) {
    return `/${additionClean}`;
  }

  if (!additionClean) {
    return `/${baseClean}`;
  }

  return `/${baseClean}/${additionClean}`;
}

function collectRoutes(stack = [], parentPath = "") {
  const routes = [];

  for (const layer of stack || []) {
    if (layer.route) {
      const routePaths = Array.isArray(layer.route.path)
        ? layer.route.path
        : [layer.route.path];

      const methods = Object.keys(layer.route.methods || {}).map((method) =>
        method.toUpperCase()
      );

      for (const method of methods) {
        for (const routePath of routePaths) {
          if (!routePath && !parentPath) {
            routes.push(`${method} /`);
            continue;
          }

          const normalizedPath = joinPaths(parentPath, routePath);
          routes.push(`${method} ${normalizedPath}`);
        }
      }
    }

    if (layer.name === "router" && layer.handle?.stack) {
      const nestedPrefix = sanitizeLayerPath(layer.regexp?.source);
      const childPrefix = nestedPrefix
        ? joinPaths(parentPath, nestedPrefix)
        : parentPath;

      routes.push(...collectRoutes(layer.handle.stack, childPrefix));
    }
  }

  return routes;
}

function getRouterStack() {
  return expressApp?._router?.stack || [];
}

export function generateRealitySnapshot() {
  const stack = getRouterStack();
  const routes = collectRoutes(stack);
  const sorted = [...new Set(routes)].sort();
  const hash = crypto
    .createHash("sha256")
    .update(sorted.join("\n"))
    .digest("hex");

  return {
    generatedAt: new Date().toISOString(),
    routes: sorted,
    hash,
  };
}

export function setExpectedRealityHash(hash, actor = "system") {
  expectedRealityHash = hash;
  expectedRealitySetAt = new Date().toISOString();
  expectedRealitySetBy = actor || "system";
}

export function ensureExpectedRealityHash() {
  if (!expectedRealityHash) {
    const snapshot = generateRealitySnapshot();
    setExpectedRealityHash(snapshot.hash, "system");
  }
}

export function getExpectedRealityState() {
  return {
    expectedHash: expectedRealityHash,
    setAt: expectedRealitySetAt,
    setBy: expectedRealitySetBy,
  };
}

export function shouldGuardRoute(req) {
  return AI_GUARDED_ROUTES.has(req.path);
}

export function aiSafetyGate(req, res, next) {
  if (!shouldGuardRoute(req)) {
    return next();
  }

  const status = getAiStatus();
  if (!status.aiEnabled) {
    return res.status(503).json({
      error: "AI_DISABLED",
      reason: status.reason,
      updatedAt: status.updatedAt,
      updatedBy: status.updatedBy,
    });
  }

  ensureExpectedRealityHash();
  const snapshot = generateRealitySnapshot();
  res.locals.realitySnapshot = snapshot;

  if (expectedRealityHash && snapshot.hash !== expectedRealityHash) {
    return res.status(409).json({
      error: "REALITY_MISMATCH",
      expectedHash: expectedRealityHash,
      currentHash: snapshot.hash,
    });
  }

  next();
}

export {
  PROOF_TYPES,
  REQUIRED_PROOF_TYPES_FOR_CRITICAL,
};

// ==================== DRIFT & HALLUCINATION PROTECTION ====================
// Extracted from server.js

export async function detectHallucinations(aiResponse, context, sourceMember) {
  try {
    const hallucinationIndicators = [
      /I don't have access to/i,
      /I cannot/i,
      /I'm not able to/i,
      /as an AI language model/i,
      /I don't have real-time/i,
      /I cannot browse/i,
    ];

    const hasHallucinationPattern = hallucinationIndicators.some(pattern =>
      pattern.test(aiResponse)
    );

    const vaguePatterns = [
      /might work/i,
      /could potentially/i,
      /perhaps/i,
      /maybe/i,
      /I think/i,
      /I believe/i,
    ];

    const vagueCount = vaguePatterns.filter(pattern => pattern.test(aiResponse)).length;
    const isVague = vagueCount >= 3;

    const contradictions = [
      /but.*however/i,
      /although.*but/i,
      /on one hand.*on the other hand/i,
    ];

    const hasContradictions = contradictions.some(pattern => pattern.test(aiResponse));

    return {
      hasHallucinationPattern,
      isVague,
      hasContradictions,
      vagueCount,
      confidence: hasHallucinationPattern || isVague || hasContradictions ? "low" : "medium",
    };
  } catch (error) {
    console.warn(`Hallucination detection error: ${error.message}`);
    return { confidence: "unknown" };
  }
}

function extractKeyClaims(response) {
  const claims = [];
  const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
  claims.push(...codeBlocks);
  const solutions = response.match(/(?:^|\n)[\d\-\*]\s+[^\n]+/g) || [];
  claims.push(...solutions);
  return claims;
}

function extractSolutionPattern(response) {
  const patterns = [
    /(?:fix|solution|approach|method):\s*([^\n]+)/i,
    /(?:use|try|implement):\s*([^\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) return match[1].toLowerCase();
  }
  return response.substring(0, 100).toLowerCase();
}

function calculateAgreement(patterns) {
  if (patterns.length < 2) return 0;
  let matches = 0;
  for (let i = 0; i < patterns.length; i++) {
    for (let j = i + 1; j < patterns.length; j++) {
      const words1 = new Set(patterns[i].split(/\s+/));
      const words2 = new Set(patterns[j].split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      const similarity = intersection.size / union.size;
      if (similarity > 0.3) matches++;
    }
  }
  const totalPairs = (patterns.length * (patterns.length - 1)) / 2;
  return matches / totalPairs;
}

function findContradictions(claims) {
  const contradictions = [];
  const keywords = ["cannot", "should not", "don't", "never", "avoid"];
  const positiveKeywords = ["can", "should", "do", "always", "use"];

  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const text1 = claims[i].claims.join(" ").toLowerCase();
      const text2 = claims[j].claims.join(" ").toLowerCase();
      for (const neg of keywords) {
        for (const pos of positiveKeywords) {
          if (text1.includes(neg) && text2.includes(pos)) {
            contradictions.push({
              member1: claims[i].member,
              member2: claims[j].member,
              type: "contradiction",
            });
          }
        }
      }
    }
  }
  return contradictions;
}

export async function crossValidateResponses(responses, context) {
  try {
    if (responses.length < 2) {
      return { validated: true, confidence: "low", reason: "Insufficient responses for validation" };
    }

    const claims = responses.map(r => ({
      member: r.member,
      claims: extractKeyClaims(r.response),
    }));

    const solutionPatterns = responses.map(r => extractSolutionPattern(r.response));
    const agreementScore = calculateAgreement(solutionPatterns);
    const contradictions = findContradictions(claims);

    const validated = agreementScore >= 0.6 && contradictions.length === 0;
    const confidence = agreementScore >= 0.8 ? "high" : agreementScore >= 0.6 ? "medium" : "low";

    return {
      validated,
      confidence,
      agreementScore,
      contradictions,
      reason: validated
        ? `High agreement (${(agreementScore * 100).toFixed(0)}%)`
        : `Low agreement (${(agreementScore * 100).toFixed(0)}%) or contradictions found`,
    };
  } catch (error) {
    console.warn(`Cross-validation error: ${error.message}`);
    return { validated: false, confidence: "unknown", reason: error.message };
  }
}
