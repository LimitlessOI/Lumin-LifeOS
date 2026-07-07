// SYNOPSIS: SocialMediaOS content intelligence gate that decides publish vs hold using local heuristics plus optional council-member judgments.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;
  return normalized.split(" ").filter(Boolean).length;
}

function sentenceCount(text) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;
  const matches = normalized.match(/[.!?]+(\s|$)/g);
  return matches ? matches.length : 1;
}

function parseBooleanLikeText(text) {
  const t = normalizeText(text).toLowerCase();
  if (!t) return null;
  if (/\b(true|yes|pass|publish|ok|approve|green)\b/.test(t)) return true;
  if (/\b(false|no|fail|hold|reject|red)\b/.test(t)) return false;
  return null;
}

function extractReason(text) {
  const normalized = normalizeText(text);
  if (!normalized) return "";
  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines[0] || normalized.slice(0, 240);
}

function hasQuestionableAccuracySignals({ title, hook, body }) {
  const combined = normalizeText([title, hook, body].join(" "));
  const signals = [
    /\b(always|never|guaranteed|guarantee|100%|perfect|instantly|without effort)\b/i,
    /\bsecret\b/i,
    /\binsider\b/i,
    /\bshocking\b/i,
    /\breveals?\b/i,
    /\bno one\b/i,
    /\bbest\b/i,
  ];
  return signals.some((re) => re.test(combined));
}

function localHeuristics(piece) {
  const checks = [];

  const title = normalizeText(piece?.title);
  const hook = normalizeText(piece?.hook);
  const body = normalizeText(piece?.body);
  const thumbnailConcept = normalizeText(piece?.thumbnailConcept);

  const hookWords = wordCount(hook);
  const bodyWords = wordCount(body);
  const titleWords = wordCount(title);
  const totalWords = wordCount([title, hook, body].join(" "));
  const bodySentences = sentenceCount(body);

  const hookKeepsAttention = hookWords > 0 && hookWords <= 22 && !hook.endsWith(".");
  checks.push({
    name: "hook_15s_fit",
    pass: hookKeepsAttention && totalWords >= 20,
    reason: hookKeepsAttention
      ? "hook is concise enough for a short attention window"
      : "hook is too long or missing for a quick attention window",
  });

  const reasonToStayAt30s = bodyWords >= 45 || bodySentences >= 3;
  checks.push({
    name: "reason_to_stay_30s",
    pass: reasonToStayAt30s,
    reason: reasonToStayAt30s
      ? "enough substance to justify a longer watch"
      : "not enough substance to justify the longer segment",
  });

  let thumbnailMatchesTitle = true;
  if (title && thumbnailConcept) {
    const titleTokens = title.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
    const thumbLower = thumbnailConcept.toLowerCase();
    const overlap = titleTokens.filter((token) => thumbLower.includes(token));
    thumbnailMatchesTitle = overlap.length > 0;
  } else if (!thumbnailConcept) {
    thumbnailMatchesTitle = true;
  } else {
    thumbnailMatchesTitle = false;
  }
  checks.push({
    name: "thumbnail_matches_title",
    pass: thumbnailMatchesTitle,
    reason: thumbnailMatchesTitle
      ? "thumbnail concept aligns with the title"
      : "thumbnail concept does not clearly match the title",
  });

  const infoAccurate = !hasQuestionableAccuracySignals({ title, hook, body });
  checks.push({
    name: "info_accurate",
    pass: infoAccurate,
    reason: infoAccurate
      ? "no strong exaggerated or misleading claims detected"
      : "copy contains potentially exaggerated or misleading claims",
  });

  const somethingCompetitorsDontHave = bodyWords >= 35 && /(\bunique\b|\bdifferent\b|\bonly\b|\bfirst\b|\bnew\b|\bcontrarian\b|\bedge\b|\badvantage\b)/i.test(
    [title, hook, body].join(" ")
  );
  checks.push({
    name: "competitor_edge",
    pass: somethingCompetitorsDontHave,
    reason: somethingCompetitorsDontHave
      ? "piece suggests a differentiator or edge"
      : "no clear differentiator surfaced from the text",
  });

  return checks;
}

async function askCouncil(callCouncilMember, role, prompt) {
  if (typeof callCouncilMember !== "function") {
    return { pass: null, reason: "ai_unavailable" };
  }
  try {
    const raw = await callCouncilMember(role, prompt, { temperature: 0.2 });
    const pass = parseBooleanLikeText(raw);
    const reason = extractReason(raw) || "ai_review_completed";
    return { pass, reason: reason || "ai_review_completed" };
  } catch (error) {
    return { pass: null, reason: `ai_error:${error?.message || String(error)}` };
  }
}

export async function publishOrKill({ callCouncilMember, piece }) {
  try {
    const safePiece = {
      title: normalizeText(piece?.title),
      hook: normalizeText(piece?.hook),
      body: normalizeText(piece?.body),
      thumbnailConcept: normalizeText(piece?.thumbnailConcept),
    };

    const checks = [...localHeuristics(safePiece)];

    const aiHookPrompt = [
      "Decide whether this content should publish or hold.",
      "Return a short verdict and one short reason.",
      "Criteria:",
      "- hook must work in ~15s attention window",
      "- give a reason to stay ~30s if content has enough substance",
      "- thumbnail must match the title if a thumbnail concept is provided",
      "- info must be accurate and not exaggerated",
      "- look for a real differentiator vs competitors",
      "",
      `TITLE: ${safePiece.title || "(missing)"}`,
      `HOOK: ${safePiece.hook || "(missing)"}`,
      `BODY: ${safePiece.body || "(missing)"}`,
      `THUMBNAIL: ${safePiece.thumbnailConcept || "(missing)"}`,
    ].join("\n");

    const aiChecks = [
      { name: "hook_15s_fit_ai", role: "editor", label: "hook_15s_fit" },
      { name: "reason_to_stay_30s_ai", role: "editor", label: "reason_to_stay_30s" },
      { name: "thumbnail_matches_title_ai", role: "designer", label: "thumbnail_matches_title" },
      { name: "info_accurate_ai", role: "fact_checker", label: "info_accurate" },
      { name: "competitor_edge_ai", role: "strategist", label: "competitor_edge" },
    ];

    for (const spec of aiChecks) {
      const result = await askCouncil(callCouncilMember, spec.role, aiHookPrompt + `\n\nFOCUS: ${spec.label}`);
      checks.push({
        name: spec.name,
        pass: result.pass,
        reason: result.reason,
      });
    }

    const requiredCheckNames = [
      "hook_15s_fit",
      "reason_to_stay_30s",
      "thumbnail_matches_title",
      "info_accurate",
      "competitor_edge",
    ];

    const blockingReasons = [];
    for (const name of requiredCheckNames) {
      const check = checks.find((c) => c.name === name || c.name === `${name}_ai`);
      if (!check) {
        blockingReasons.push(`${name}:missing`);
        continue;
      }
      if (check.pass === false) blockingReasons.push(`${name}:${check.reason}`);
      if (check.pass == null) blockingReasons.push(`${name}:${check.reason || "ai_unavailable"}`);
    }

    const allLocalPass = requiredCheckNames.every((name) => {
      const check = checks.find((c) => c.name === name);
      return check?.pass === true;
    });

    const allAiPassOrUnavailable = aiChecks.every((spec) => {
      const check = checks.find((c) => c.name === spec.name);
      return check?.pass === true || check?.pass == null;
    });

    const verdict = allLocalPass && allAiPassOrUnavailable && blockingReasons.length === 0 ? "publish" : "hold";

    return {
      ok: true,
      verdict,
      checks,
      blockingReasons,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error?.message || String(error),
        name: error?.name || "Error",
      },
    };
  }
}

export default publishOrKill;