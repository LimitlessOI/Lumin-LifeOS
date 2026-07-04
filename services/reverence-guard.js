/**
 * SYNOPSIS: Exports createReverenceGuard — services/reverence-guard.js.
 */
export function createReverenceGuard({ pool }) {
  const SENSITIVE_CONTENT_PATTERNS = [
    {
      type: 'self_harm',
      pattern: /\b(kill myself|end my life|suicide|self[-\s]?harm|hurt myself)\b/i,
      severity: 'critical',
      guidance:
        'Respond with care, avoid glamorization, and encourage immediate local emergency help or crisis resources.',
    },
    {
      type: 'violence',
      pattern: /\b(kill|murder|hurt|attack|destroy|genocide|exterminate)\b/i,
      severity: 'high',
      guidance:
        'Avoid endorsing violence or providing actionable harm instructions.',
    },
    {
      type: 'sexual_content',
      pattern: /\b(explicit sex|porn|pornography|erotic|nude|naked)\b/i,
      severity: 'medium',
      guidance:
        'Keep the output non-explicit and respectful.',
    },
    {
      type: 'hate_or_harassment',
      pattern: /\b(hate|slur|racist|sexist|bigot|dehumanize|harass)\b/i,
      severity: 'high',
      guidance:
        'Avoid hateful or demeaning language; keep the tone dignified.',
    },
    {
      type: 'occult_or_spellcasting',
      pattern: /\b(spell|curse|summon|invoke|ritual)\b/i,
      severity: 'medium',
      guidance:
        'Keep spiritual language reverent and avoid sensationalism or coercive framing.',
    },
  ];

  function normalizeText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function inspectContent(text) {
    const normalized = normalizeText(text);
    const hits = [];

    for (const rule of SENSITIVE_CONTENT_PATTERNS) {
      if (rule.pattern.test(normalized)) {
        hits.push({
          type: rule.type,
          severity: rule.severity,
          guidance: rule.guidance,
        });
      }
    }

    const sacredGuidelines = {
      avoid: [
        'mocking or dismissive treatment of faith',
        'explicit sexualization of sacred figures or practices',
        'violent or blasphemous framing aimed at worship content',
        'hate, harassment, or demeaning language toward believers',
        'manipulative or coercive spiritual authority claims',
      ],
      prefer: [
        'reverent, respectful language',
        'gentle and dignified phrasing',
        'inclusive tone without doctrinal hostility',
        'careful handling of sensitive spiritual topics',
      ],
    };

    return {
      text: normalized,
      flagged: hits.length > 0,
      hits,
      sacredGuidelines,
    };
  }

  async function logReview(entry) {
    if (!pool?.query) return null;

    const payload = {
      reviewed_at: new Date().toISOString(),
      ...entry,
    };

    const { rows } = await pool.query(
      `INSERT INTO reverence_guard_reviews (input_text, flagged, findings, created_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       RETURNING *`,
      [payload.input_text || null, !!payload.flagged, JSON.stringify(payload)],
    );

    return rows[0] || null;
  }

  async function guardOutput({ text, context = {} }) {
    const inspection = inspectContent(text);

    if (inspection.flagged) {
      const { rows } = await pool.query(
        `SELECT $1::text AS sanitized_text`,
        [
          inspection.text,
        ],
      );

      const sanitizedText = rows[0]?.sanitized_text || inspection.text;

      await logReview({
        input_text: inspection.text,
        flagged: true,
        findings: inspection.hits,
        context,
      });

      return {
        allowed: false,
        sanitized: true,
        text: sanitizedText,
        findings: inspection.hits,
        sacredGuidelines: inspection.sacredGuidelines,
      };
    }

    await logReview({
      input_text: inspection.text,
      flagged: false,
      findings: [],
      context,
    });

    return {
      allowed: true,
      sanitized: false,
      text: inspection.text,
      findings: [],
      sacredGuidelines: inspection.sacredGuidelines,
    };
  }

  return {
    guardOutput,
    inspectContent,
  };
}