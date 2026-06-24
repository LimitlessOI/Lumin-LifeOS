/**
 * SYNOPSIS: Monitors conversation_messages → coaching lessons + commitments + calendar.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function extractJsonBlock(text, fallback) {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return safeJsonParse(fence[1].trim(), fallback);
  const start = raw.indexOf('{');
  const startArray = raw.indexOf('[');
  let idx = -1;
  if (start >= 0 && startArray >= 0) idx = Math.min(start, startArray);
  else idx = Math.max(start, startArray);
  if (idx >= 0) return safeJsonParse(raw.slice(idx), fallback);
  return fallback;
}

function normalizeImpact(value) {
  const v = String(value || 'medium').trim().toLowerCase();
  return ['small', 'medium', 'large', 'unknown'].includes(v) ? v : 'medium';
}

export function createCoachingConversationMonitor({
  pool,
  callAI = null,
  eventStream = null,
  memoryIntel = null,
  commitments = null,
  logger = console,
}) {
  async function getControl(userId) {
    const { rows } = await pool.query(
      `SELECT user_id, last_conversation_message_id, last_scan_at,
              last_lesson_count, last_commitment_count, updated_at
         FROM lifeos_coaching_monitor_control
        WHERE user_id = $1
        LIMIT 1`,
      [userId],
    ).catch(() => ({ rows: [] }));
    return rows[0] || {
      user_id: userId,
      last_conversation_message_id: 0,
      last_scan_at: null,
      last_lesson_count: 0,
      last_commitment_count: 0,
      updated_at: null,
    };
  }

  async function setControl(userId, patch = {}) {
    const watermark = Number(patch.last_conversation_message_id || 0);
    await pool.query(
      `INSERT INTO lifeos_coaching_monitor_control
         (user_id, last_conversation_message_id, last_scan_at,
          last_lesson_count, last_commitment_count, updated_at)
       VALUES ($1, $2, NOW(), $3, $4, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         last_conversation_message_id = GREATEST(
           lifeos_coaching_monitor_control.last_conversation_message_id,
           EXCLUDED.last_conversation_message_id
         ),
         last_scan_at = NOW(),
         last_lesson_count = EXCLUDED.last_lesson_count,
         last_commitment_count = EXCLUDED.last_commitment_count,
         updated_at = NOW()`,
      [
        userId,
        watermark,
        Number(patch.last_lesson_count || 0),
        Number(patch.last_commitment_count || 0),
      ],
    );
  }

  async function fetchNewMessages(userId, watermark, limit = 40) {
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 40));
    const { rows } = await pool.query(
      `SELECT cm.id,
              cm.role,
              cm.content,
              cm.timestamp,
              cm.session_id,
              cm.conversation_id,
              c.source,
              c.project,
              c.summary AS conversation_summary
         FROM conversation_messages cm
         LEFT JOIN conversations c ON c.id = cm.conversation_id
        WHERE cm.id > $1
          AND cm.content IS NOT NULL
          AND length(trim(cm.content)) > 12
        ORDER BY cm.id ASC
        LIMIT $2`,
      [watermark, safeLimit],
    );
    return rows;
  }

  async function extractCoachingInsights(messages) {
    if (!callAI || !messages.length) return { lessons: [], summary: null };

    const transcript = messages
      .map((m) => `[${m.role}] ${String(m.content || '').trim().slice(0, 1200)}`)
      .join('\n\n')
      .slice(0, 12000);

    const prompt = `You analyze Adam's conversations for personal coaching accountability.

Extract ONLY what Adam explicitly said or clearly committed to — not assistant suggestions he did not adopt.

Return JSON only:
{
  "summary": "1-2 sentence plain English of what Adam is working on in this batch",
  "lessons": [
    {
      "problem": "what obstacle or pattern showed up",
      "solution": "what Adam decided or should remember",
      "impact_class": "small|medium|large",
      "tags": ["coaching","accountability"],
      "source_message_id": 123,
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- lessons = insights Adam is learning (mindset, habits, business, relationships)
- skip generic AI advice; only Adam-origin insights
- confidence >= 0.75 to include a lesson
- max 5 lessons per batch

Transcript:
${transcript}`;

    try {
      const raw = await callAI(prompt);
      const parsed = extractJsonBlock(raw, { lessons: [], summary: null });
      const lessons = Array.isArray(parsed?.lessons) ? parsed.lessons : [];
      return {
        summary: parsed?.summary || null,
        lessons: lessons
          .map((item) => ({
            problem: String(item?.problem || '').trim(),
            solution: String(item?.solution || '').trim(),
            impact_class: normalizeImpact(item?.impact_class),
            tags: Array.isArray(item?.tags) ? item.tags.map(String) : ['coaching'],
            source_message_id: Number(item?.source_message_id || messages[messages.length - 1]?.id || 0),
            confidence: Number(item?.confidence ?? 0.7),
          }))
          .filter((item) => item.problem && item.solution && item.confidence >= 0.75),
      };
    } catch (err) {
      logger.warn?.('[COACHING-MONITOR] lesson extraction failed:', err.message);
      return { lessons: [], summary: null };
    }
  }

  async function recordLessons(lessons) {
    if (!lessons.length) return [];
    const recorded = [];
    for (const lesson of lessons) {
      const surfacedBy = `conversation_message:${lesson.source_message_id}`;
      const { rows: existing } = await pool.query(
        `SELECT id FROM lessons_learned WHERE surfaced_by = $1 LIMIT 1`,
        [surfacedBy],
      ).catch(() => ({ rows: [] }));
      if (existing[0]) continue;

      if (memoryIntel?.recordLesson) {
        const row = await memoryIntel.recordLesson({
          domain: 'coaching',
          impactClass: lesson.impact_class,
          problem: lesson.problem,
          solution: lesson.solution,
          howNovel: 'known but hard',
          surfacedBy,
          tags: [...new Set(['coaching', 'adam', ...(lesson.tags || [])])],
        });
        recorded.push(row);
        continue;
      }

      const { rows } = await pool.query(
        `INSERT INTO lessons_learned
           (domain, impact_class, problem, solution, how_novel, surfaced_by, tags)
         VALUES ('coaching', $1, $2, $3, 'known but hard', $4, $5::text[])
         RETURNING *`,
        [
          lesson.impact_class,
          lesson.problem,
          lesson.solution,
          surfacedBy,
          [...new Set(['coaching', 'adam', ...(lesson.tags || [])])],
        ],
      );
      recorded.push(rows[0]);
    }
    return recorded;
  }

  async function applyHighConfidenceEvents(userId, events) {
    if (!eventStream?.applyEvent) return { applied: 0 };
    let applied = 0;
    for (const captured of events || []) {
      const actions = captured.actions || [];
      if (!actions.length) continue;
      const allActionable = actions.every((a) =>
        ['commitment', 'calendar_event'].includes(a.action_type || a.actionType),
      );
      if (!allActionable) continue;
      try {
        const result = await eventStream.applyEvent(userId, captured.event?.id || captured.event_id);
        if (result?.applied_count > 0) applied += result.applied_count;
      } catch (err) {
        logger.warn?.('[COACHING-MONITOR] apply failed:', err.message);
      }
    }
    return { applied };
  }

  async function scanUser({
    userId,
    limit = 40,
    autoApplyActions = true,
  } = {}) {
    if (!userId) throw new Error('userId is required');

    const control = await getControl(userId);
    const watermark = Number(control.last_conversation_message_id || 0);
    const messages = await fetchNewMessages(userId, watermark, limit);

    let ingestResult = { ingested_count: 0, events: [] };
    if (eventStream?.ingestConversationMessages) {
      ingestResult = await eventStream.ingestConversationMessages({
        userId,
        limit,
        autoApply: false,
      });
    }

    let lessonsRecorded = [];
    if (messages.length && callAI) {
      const { lessons } = await extractCoachingInsights(messages);
      lessonsRecorded = await recordLessons(lessons);
    }

    let applyResult = { applied: 0 };
    if (autoApplyActions && ingestResult.events?.length) {
      applyResult = await applyHighConfidenceEvents(userId, ingestResult.events);
    }

    const newWatermark = messages.length
      ? Math.max(watermark, ...messages.map((m) => Number(m.id || 0)))
      : Number(ingestResult.last_message_id || watermark);

    if (newWatermark > watermark || lessonsRecorded.length || ingestResult.ingested_count) {
      await setControl(userId, {
        last_conversation_message_id: newWatermark,
        last_lesson_count: lessonsRecorded.length,
        last_commitment_count: applyResult.applied,
      });
    }

    return {
      user_id: userId,
      messages_scanned: messages.length,
      conversations_ingested: ingestResult.ingested_count,
      lessons_recorded: lessonsRecorded.length,
      actions_applied: applyResult.applied,
      last_message_id: newWatermark,
      lessons: lessonsRecorded,
      pending_events: ingestResult.events?.length || 0,
    };
  }

  async function getFeed(userId, { lessonLimit = 12, eventLimit = 15 } = {}) {
    const control = await getControl(userId);
    const { rows: lessons } = await pool.query(
      `SELECT id, domain, impact_class, problem, solution, surfaced_by, tags, created_at
         FROM lessons_learned
        WHERE domain = 'coaching'
           OR 'coaching' = ANY(tags)
        ORDER BY created_at DESC
        LIMIT $1`,
      [Math.max(1, Math.min(50, parseInt(lessonLimit, 10) || 12))],
    ).catch(() => ({ rows: [] }));

    const events = eventStream?.listEvents
      ? await eventStream.listEvents(userId, { limit: eventLimit })
      : [];

    const pending = (events || []).filter((ev) => {
      const actions = ev.actions || [];
      return actions.some((a) => a.status === 'suggested');
    });

    let overdueCount = 0;
    let openCount = 0;
    if (commitments?.getOverdue && commitments?.getOpen) {
      const overdue = await commitments.getOverdue(userId).catch(() => []);
      const open = await commitments.getOpen(userId).catch(() => []);
      overdueCount = overdue.length;
      openCount = open.length;
    }

    const ingestStatus = eventStream?.getIngestStatus
      ? await eventStream.getIngestStatus(userId)
      : null;

    return {
      control,
      lessons,
      pending_events: pending,
      overdue_commitments: overdueCount,
      open_commitments: openCount,
      ingest_status: ingestStatus,
    };
  }

  return {
    getControl,
    scanUser,
    getFeed,
    fetchNewMessages,
  };
}
