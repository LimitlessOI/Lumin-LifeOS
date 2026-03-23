/**
 * @ssot docs/projects/AMENDMENT_15_BUSINESS_TOOLS.md
 */
function extractFirstJsonValue(rawText) {
  if (!rawText || typeof rawText !== "string") return null;

  const tryParse = (candidate) => {
    if (!candidate || typeof candidate !== "string") return null;
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  // a) Fenced blocks ```json ...``` or ``` ... ``` (first valid)
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let fenceMatch;
  while ((fenceMatch = fenceRe.exec(rawText)) !== null) {
    const parsed = tryParse(fenceMatch[1]);
    if (parsed !== null) return parsed;
  }

  // b) Scan raw text for first valid {...} or [...] substring
  const text = rawText;
  const len = text.length;
  const isOpen = (ch) => ch === "{" || ch === "[";
  const isClose = (ch) => ch === "}" || ch === "]";
  const matches = (open, close) =>
    (open === "{" && close === "}") || (open === "[" && close === "]");

  for (let start = 0; start < len; start += 1) {
    const ch0 = text[start];
    if (!isOpen(ch0)) continue;

    let inString = false;
    let escape = false;
    const stack = [ch0];

    for (let i = start + 1; i < len; i += 1) {
      const ch = text[i];

      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (isOpen(ch)) {
        stack.push(ch);
        continue;
      }

      if (isClose(ch)) {
        const top = stack[stack.length - 1];
        if (!matches(top, ch)) break;
        stack.pop();
        if (stack.length === 0) {
          const candidate = text.slice(start, i + 1);
          const parsed = tryParse(candidate);
          if (parsed !== null) return parsed;
          break;
        }
      }
    }
  }

  // c) Raw text is pure JSON
  const direct = tryParse(rawText);
  if (direct !== null) return direct;

  // d) No parseable JSON
  return null;
}

function safeJsonExtract(rawCouncilText) {
  return extractFirstJsonValue(String(rawCouncilText || ""));
}

function validateWebsiteAuditSchema(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    errors.push("payload is not an object");
    return { valid: false, errors };
  }

  if (typeof payload.summary !== "string") {
    errors.push("summary must be a string");
  }

  if (!Array.isArray(payload.site_map)) {
    errors.push("site_map must be an array");
  }

  if (!Array.isArray(payload.copy_blocks)) {
    errors.push("copy_blocks must be an array");
  }

  if (!Array.isArray(payload.seo)) {
    errors.push("seo must be an array");
  }

  if (!Array.isArray(payload.conversion_funnels)) {
    errors.push("conversion_funnels must be an array");
  }

  if (!Array.isArray(payload.schema_markup)) {
    errors.push("schema_markup must be an array");
  }

  if (!Array.isArray(payload.actions_next_72h)) {
    errors.push("actions_next_72h must be an array");
  }

  if (!payload.proof || typeof payload.proof !== "object") {
    errors.push("proof must be an object");
  } else {
    if (typeof payload.proof.model !== "string") {
      errors.push("proof.model must be a string");
    }
    if (typeof payload.proof.timestamp !== "string") {
      errors.push("proof.timestamp must be a string");
    }
  }

  return { valid: errors.length === 0, errors };
}

function sanitizeWebsiteAuditPayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  return {
    summary: String(payload.summary || "").trim(),
    site_map: Array.isArray(payload.site_map) ? payload.site_map : [],
    copy_blocks: Array.isArray(payload.copy_blocks) ? payload.copy_blocks : [],
    seo: Array.isArray(payload.seo) ? payload.seo : [],
    conversion_funnels: Array.isArray(payload.conversion_funnels) ? payload.conversion_funnels : [],
    schema_markup: Array.isArray(payload.schema_markup) ? payload.schema_markup : [],
    actions_next_72h: Array.isArray(payload.actions_next_72h) ? payload.actions_next_72h : [],
    proof: {
      model: String(payload.proof?.model || "open_source_council"),
      timestamp: String(payload.proof?.timestamp || new Date().toISOString()),
    },
  };
}

function previewFromText(text) {
  return String(text || "").replace(/\s+/g, " ").slice(0, 400);
}

function buildFallbackAudit(business_type, location, error) {
  const timestamp = new Date().toISOString();
  const summary = `Fallback audit for ${business_type || "the business"} in ${location || "your market"} while the AI council is unavailable.`;
  return {
    summary,
    site_map: [
      "Homepage (restate value prop + clear CTA)",
      "Offer page (pricing + proof)",
      "Contact + booking page"
    ],
    copy_blocks: [
      {
        section: "Hero",
        copy: `Pitch ${business_type || "your services"} with a quantitative benefit and a single CTA.`,
      },
      {
        section: "Social proof",
        copy: "List metrics, testimonials, or logos that build trust quickly."
      }
    ],
    seo: [
      "Use keyword-rich titles/descriptions for pricing + service pages",
      "Add schema markup for local business + FAQs"
    ],
    conversion_funnels: [
      "Hero CTA -> Calendly/booking form",
      "Offer comparison -> pricing page -> cart"
    ],
    schema_markup: [
      "LocalBusiness JSON-LD (address, phone, hours)",
      "FAQPage JSON-LD for top questions"
    ],
    actions_next_72h: [
      "Duplicate competitor top-performing section and test CTA",
      "Add AI chat whisper (modeled on your brand tone)",
      "Document SEO keywords + metadata for hero + pricing pages"
    ],
    proof: {
      model: "fallback-stub",
      timestamp,
      message: error?.message || "Council unreachable"
    },
    fallback: true,
    fallback_reason: error?.message || "Council unavailable",
  };
}

export function runWebsiteAuditJsonSelfTest() {
  const cases = [
    {
      name: "fenced-object",
      input: "```json\n{\"ok\":true}\n```",
      expected: (v) => v && v.ok === true,
    },
    {
      name: "fenced-array",
      input: "```\n[1,2,3]\n```",
      expected: (v) => Array.isArray(v) && v.length === 3,
    },
    {
      name: "embedded-json",
      input: "prefix {\"a\":1, \"b\":{\"c\":2}} suffix",
      expected: (v) => v && v.b && v.b.c === 2,
    },
    {
      name: "non-json",
      input: "no json here",
      expected: (v) => v === null,
    },
  ];

  const results = cases.map((test) => {
    const value = extractFirstJsonValue(test.input);
    const ok = Boolean(test.expected(value));
    return { name: test.name, ok };
  });

  return {
    ok: results.every((r) => r.ok),
    results,
  };
}

function buildStrictJsonError(approach, raws, errors) {
  const error = new Error("No JSON object found in council response");
  error.preview = previewFromText(raws.at(-1) || raws[0] || "");
  error.validation = errors;
  error.approach = approach;
  return error;
}

export function registerWebsiteAuditRoutes(app, {
  requireKey,
  callCouncilWithFailover,
}) {
  function withTimeout(promise, ms, label = "operation") {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
  }

  async function requestStrictJson(prompt) {
    const jsonPrompt = `${prompt}\n\nReturn ONLY valid JSON. No markdown. No code fences.`;
    const retryPrompt = `${prompt}\n\nSTRICT: Return ONLY valid JSON. No prose. No markdown.`;
    const attempts = [jsonPrompt, retryPrompt];
    const errors = [];
    const raws = [];

    for (const attempt of attempts) {
      const response = await withTimeout(
        callCouncilWithFailover(attempt, "ollama_deepseek", false, {
          useOpenSourceCouncil: true,
          taskType: "analysis",
          complexity: "medium",
        }),
        20000,
        "website_audit_council_call"
      );
      raws.push(response);

      const extracted = safeJsonExtract(response);
      if (!extracted) {
        const message = response?.toString?.().slice(0, 200) || "";
        errors.push(`No JSON parsed (response snippet: ${message})`);
        continue;
      }

      const validation = validateWebsiteAuditSchema(extracted);
      if (validation.valid) {
        return sanitizeWebsiteAuditPayload(extracted);
      }

      errors.push(...validation.errors);
    }

    throw buildStrictJsonError("strict-json", raws, errors);
  }

  async function requestStrictJsonWithFallback(prompt, context = {}) {
    try {
      const payload = await requestStrictJson(prompt);
      return { payload };
    } catch (error) {
      console.warn("Website audit strict JSON guard triggered:", error.message);
      const fallbackPayload = buildFallbackAudit(
        context.business_type,
        context.location,
        error
      );
      return {
        payload: fallbackPayload,
        fallback: {
          error: error.message,
          preview: error.preview,
          validation: error.validation || [],
          reason: fallbackPayload.fallback_reason || "Council unavailable",
        },
      };
    }
  }

  app.post("/api/v1/website/audit", requireKey, async (req, res) => {
    const {
      business_type,
      location,
      competitor_urls = [],
      goals = [],
    } = req.body || {};

    try {

      if (!business_type || !location) {
        return res.status(400).json({
          error: "business_type and location are required",
        });
      }

      const prompt = `You are an AI website strategist. Create a fast audit for a ${business_type} based in ${location}.
Competitors: ${competitor_urls.join(", ") || "none"}
Goals: ${goals.join(", ") || "none"}

Return JSON with keys:
- summary (string)
- site_map (array of strings)
- copy_blocks (array of objects with section + copy)
- seo (array of strings)
- conversion_funnels (array of strings)
- schema_markup (array of strings)
- actions_next_72h (array of strings)
- proof (object with model and timestamp)
`;

      const { payload: result, fallback } = await requestStrictJsonWithFallback(
        prompt,
        { business_type, location }
      );
      const sanitized = sanitizeWebsiteAuditPayload(result);

      if (fallback) {
        if (fallback.preview) {
          console.warn("Website audit fallback preview:", fallback.preview);
        }
        res.json({
          ok: true,
          ...sanitized,
          error: "Website audit could not reach the council; returning fallback guidance.",
          preview: fallback.preview,
          validation: fallback.validation,
          fallback: true,
          fallback_reason: fallback.reason,
          analysis: sanitized,
        });
        return;
      }

      res.json({
        ok: true,
        ...sanitized,
        analysis: sanitized,
      });
    } catch (error) {
      console.error("Website audit error:", error.message);
      res.status(500).json({ ok: false, error: error.message });
    }
  });
}
