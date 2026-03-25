/**
 * services/rules-engine.js
 * @ssot docs/projects/AMENDMENT_10_API_COST_SAVINGS.md
 *
 * Deterministic pre-flight decision engine for council-service.
 *
 * Contract:
 *   evaluate({ prompt, requestedMember, member, taskType, options }) => {
 *     matched: boolean,
 *     action: 'continue' | 'respond' | 'override',
 *     responseText?: string,
 *     member?: string,
 *     taskType?: string,
 *     optionsPatch?: object,
 *     receipt: {
 *       engine: 'rules-engine-v1',
 *       ruleId: string,
 *       category: 'direct' | 'routing',
 *       confidence: number,
 *       reason: string,
 *       estimatedSavedTokens?: number,
 *     }
 *   }
 *
 * Conservative by design:
 *   - direct-response rules only fire on narrow, low-risk prompts
 *   - routing rules only tighten task type / preferred member / prompt budget
 *   - non-matching requests fall through unchanged
 */

function normalizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

function lower(text) {
  return normalizeText(text).toLowerCase();
}

function wantsJson(text) {
  const value = lower(text);
  return /\bjson\b/.test(value) || /\bvalid json\b/.test(value);
}

function toJson(value) {
  return JSON.stringify(value);
}

function findMemberBySpecialty(councilMembers, specialty) {
  const entries = Object.entries(councilMembers || {});
  const match = entries.find(([, cfg]) => Array.isArray(cfg?.specialties) && cfg.specialties.includes(specialty));
  return match?.[0] || null;
}

function formatNow(timeZone) {
  const now = new Date();
  const parts = {
    iso: now.toISOString(),
    unix: Math.floor(now.getTime() / 1000),
    date: new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now),
    weekday: new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
    }).format(now),
    time: new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now),
    timeZone,
  };
  return parts;
}

function buildDirectResponse(ruleId, reason, responseText, estimatedSavedTokens, confidence = 0.99) {
  return {
    matched: true,
    action: "respond",
    responseText,
    receipt: {
      engine: "rules-engine-v1",
      ruleId,
      category: "direct",
      confidence,
      reason,
      estimatedSavedTokens,
    },
  };
}

function buildOverride(ruleId, reason, patch, confidence = 0.9) {
  return {
    matched: true,
    action: "override",
    ...patch,
    receipt: {
      engine: "rules-engine-v1",
      ruleId,
      category: "routing",
      confidence,
      reason,
    },
  };
}

export function createRulesEngine({ COUNCIL_MEMBERS = {}, timeZone = "America/Los_Angeles" } = {}) {
  function evaluate({ prompt, requestedMember, member, taskType = "general", options = {} } = {}) {
    const original = normalizeText(prompt);
    const value = lower(prompt);
    const json = wantsJson(prompt);

    if (!original) {
      return {
        matched: false,
        action: "continue",
        receipt: {
          engine: "rules-engine-v1",
          ruleId: "none",
          category: "routing",
          confidence: 0,
          reason: "empty prompt",
        },
      };
    }

    // Direct: liveness / readiness probes
    if (/^(ping|pong|ready\?|are you ready\??|are you alive\??|health check|status check)$/i.test(original)) {
      const payload = {
        ok: true,
        status: "ok",
        source: "rules-engine",
        check: "liveness",
      };
      return buildDirectResponse(
        "direct.liveness",
        "Handled exact liveness probe without AI",
        json ? toJson(payload) : "OK",
        Math.max(4, Math.ceil(original.length / 4) + (json ? 18 : 2))
      );
    }

    // Direct: explicit online confirmation probes used internally by monitors
    if (/^(are you online\??|online\??|confirm (you('| a)?re|you are) online|reply if online)$/i.test(original)) {
      const responseText = json
        ? toJson({ ok: true, status: "online", source: "rules-engine" })
        : "ONLINE";
      return buildDirectResponse(
        "direct.online_probe",
        "Handled explicit online probe without AI",
        responseText,
        Math.max(4, Math.ceil(original.length / 4) + 3)
      );
    }

    // Direct: current date / time / weekday / timestamp
    if (/^(what('?s| is)? )?(today'?s|current )?(date|time|day|weekday|timestamp)( right now)?\??$/i.test(original)) {
      const now = formatNow(timeZone);
      const payload = {
        ok: true,
        source: "rules-engine",
        date: now.date,
        time: now.time,
        weekday: now.weekday,
        iso: now.iso,
        unix: now.unix,
        timeZone: now.timeZone,
      };

      let responseText = `Date: ${now.date}; Time: ${now.time}; Day: ${now.weekday}; TZ: ${now.timeZone}; ISO: ${now.iso}`;
      if (/\bweekday\b|\bday\b/.test(value) && !/\bdate\b|\btime\b|\btimestamp\b/.test(value)) responseText = now.weekday;
      else if (/\bdate\b/.test(value) && !/\btime\b|\bday\b|\bweekday\b|\btimestamp\b/.test(value)) responseText = now.date;
      else if (/\btime\b/.test(value) && !/\bdate\b|\bday\b|\bweekday\b|\btimestamp\b/.test(value)) responseText = `${now.time} ${now.timeZone}`;
      else if (/\btimestamp\b|\bunix\b|\biso\b/.test(value)) responseText = `${now.iso}`;

      return buildDirectResponse(
        "direct.current_datetime",
        "Handled explicit current date/time request without AI",
        json ? toJson(payload) : responseText,
        Math.max(8, Math.ceil(original.length / 4) + Math.ceil(responseText.length / 4))
      );
    }

    // Direct: list configured council members
    if (/^(list|show|what are|which are) (the )?(configured )?(ai )?council members\??$/i.test(original)) {
      const members = Object.entries(COUNCIL_MEMBERS)
        .map(([id, cfg]) => ({
          id,
          provider: cfg?.provider || "unknown",
          model: cfg?.model || "unknown",
          specialties: Array.isArray(cfg?.specialties) ? cfg.specialties : [],
          isFree: Boolean(cfg?.isFree),
          isLocal: Boolean(cfg?.isLocal),
        }));
      const responseText = json
        ? toJson({ ok: true, source: "rules-engine", members })
        : members.map((m) => `${m.id}: ${m.provider}/${m.model}`).join("\n");
      return buildDirectResponse(
        "direct.council_members",
        "Returned configured council members from local config",
        responseText,
        Math.max(12, Math.ceil(original.length / 4) + Math.ceil(responseText.length / 4) / 2)
      );
    }

    // Routing: explicit deterministic task classes
    if (/\bhealth\b|\bstatus\b|\bliveness\b|\bheartbeat\b/.test(value)) {
      return buildOverride("route.health_status", "Force small health/status path", {
        taskType: "status",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\bclassify\b|\broute\b|\bdetect\b|\bvalidate\b|\btriage\b/.test(value)) {
      const routingMember = findMemberBySpecialty(COUNCIL_MEMBERS, "routing") || member || requestedMember;
      return buildOverride("route.classification", "Force lightweight routing/classification path", {
        member: routingMember,
        taskType: "routing",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\bjson\b|\bextract\b|\bparse\b|\bschema\b|\bstructured\b/.test(value)) {
      return buildOverride("route.json_extraction", "Force deterministic extraction/json settings", {
        taskType: "json",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\breturn as json array\b|\breturn as json object\b|\breturn only valid json\b|\boutput only valid json\b|\brespond with json\b/.test(value)) {
      return buildOverride("route.json_contract", "Detected explicit JSON contract", {
        taskType: "json",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\bsummary\b|\bsummarize\b|\btldr\b|\bbrief\b/.test(value)) {
      return buildOverride("route.summary", "Force summary task type", {
        taskType: "summary",
        optionsPatch: { allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\bunder 160 chars?\b|\bunder 160 characters?\b|\b2-3 sentences max\b|\bone sentence\b|\bkeep it brief\b|\bbrief, professional\b|\bunder 30 seconds\b/.test(value)) {
      return buildOverride("route.compact_copy", "Detected hard brevity constraint", {
        taskType: "summary",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\bdraft\b|\bcompose\b|\bwrite\b/.test(value) && /\bemail\b|\bsms\b|\btext message\b|\bphone call script\b|\bcall script\b|\bfollow-up\b|\bauto-response\b|\breminder\b/.test(value)) {
      const copyMember = findMemberBySpecialty(COUNCIL_MEMBERS, "chat")
        || findMemberBySpecialty(COUNCIL_MEMBERS, "general")
        || member
        || requestedMember;
      return buildOverride("route.shortform_copy", "Detected transactional copy-generation task", {
        member: copyMember,
        taskType: "summary",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\breal estate agent\b|\bproperty showing\b|\bshowing reminder\b|\bparty intro\b|\bclose of escrow\b|\bcoe\b|\bcontingenc(y|ies)\b|\btransaction coordinator\b|\btc\b/.test(value)) {
      const tcMember = findMemberBySpecialty(COUNCIL_MEMBERS, "general")
        || findMemberBySpecialty(COUNCIL_MEMBERS, "chat")
        || member
        || requestedMember;
      return buildOverride("route.tc_re_copy", "Detected TC / real-estate operational prompt", {
        member: tcMember,
        taskType: /\bjson\b|\bextract\b/.test(value) ? "json" : "summary",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\bsubject:\b|\bformat as subject\b|\bthen \[body]\b|\bthen \[body/.test(value)) {
      return buildOverride("route.subject_body", "Detected subject/body output format", {
        taskType: "summary",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\bwrite a function\b|\bwrite a class\b|\bbuild a route\b|\bimplement\b|\brefactor\b|\bdebug\b|\bcode\b/.test(value)) {
      const codeMember = findMemberBySpecialty(COUNCIL_MEMBERS, "code") || findMemberBySpecialty(COUNCIL_MEMBERS, "development");
      return buildOverride("route.code", "Prefer code-specialist member for coding tasks", {
        member: codeMember || member || requestedMember,
        taskType: "codegen",
        optionsPatch: { skipKnowledge: true, complexity: "complex" },
      });
    }

    if (/\bresearch\b|\bcompare\b|\binvestigate\b|\bdocument\b|\bdocs\b|\bpaper\b/.test(value)) {
      const researchMember = findMemberBySpecialty(COUNCIL_MEMBERS, "research") || findMemberBySpecialty(COUNCIL_MEMBERS, "analysis");
      return buildOverride("route.research", "Prefer research-oriented member for document/research tasks", {
        member: researchMember || member || requestedMember,
        taskType: "analysis",
        optionsPatch: { allowModelDowngrade: true, complexity: "complex" },
      });
    }

    if (/\bevaluate your own response\b|\brate your response\b|\baccuracy\b|\bcompleteness\b|\brelevance\b|\bsatisfaction\b/.test(value) && /\brespond with json\b|\bjson\b/.test(value)) {
      return buildOverride("route.self_eval_json", "Detected self-evaluation scoring prompt", {
        taskType: "json",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    if (/\banalyze (these )?(logs|errors)\b|\bsyntax error\b|\breferenceerror\b|\btypeerror\b|\bmissing package\b|\bmissing module\b/.test(value)) {
      const codeMember = findMemberBySpecialty(COUNCIL_MEMBERS, "code") || findMemberBySpecialty(COUNCIL_MEMBERS, "development");
      return buildOverride("route.logs_and_fixes", "Detected log/error analysis prompt", {
        member: codeMember || member || requestedMember,
        taskType: "analysis",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "complex" },
      });
    }

    if (/\bverify\b|\bverification\b|\bendpoint\b|\bexpected status\b|\bhealth check passed\b|\bdeployment successful\b|\bfeature works\b/.test(value)) {
      return buildOverride("route.verification", "Detected verification/status-report prompt", {
        taskType: "validation",
        optionsPatch: { skipKnowledge: true, allowModelDowngrade: true, complexity: "simple" },
      });
    }

    return {
      matched: false,
      action: "continue",
      receipt: {
        engine: "rules-engine-v1",
        ruleId: "none",
        category: "routing",
        confidence: 0,
        reason: "no deterministic or routing rule matched",
      },
    };
  }

  return { evaluate };
}
