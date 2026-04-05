/**
 * routes/teacher-os-routes.js
 *
 * Teacher OS API — paperwork eliminator, student profiler, self-care,
 * belonging guarantee, and the class coherence engine.
 *
 * Mounted at /api/v1/teacher
 *
 * Teacher accounts:
 *   POST   /teachers                                   — enroll teacher
 *   GET    /teachers/:id                               — get teacher
 *   GET    /teachers/:id/dashboard                     — daily briefing
 *
 * Students:
 *   POST   /teachers/:id/students                      — enroll student
 *   GET    /teachers/:id/students                      — class roster
 *   GET    /teachers/:id/students/:studentId            — get student
 *   POST   /teachers/:id/students/:studentId/wins       — log win
 *   GET    /teachers/:id/belonging                     — belonging report
 *   POST   /teachers/:id/students/:studentId/entry-points — individualized entry points
 *   POST   /teachers/:id/students/:studentId/flag       — flag misidentification pattern
 *   GET    /teachers/:id/misidentification              — misidentification report
 *
 * Documents:
 *   POST   /teachers/:id/documents                     — generate document
 *   GET    /teachers/:id/documents                     — list documents
 *   POST   /teachers/:id/documents/:docId/approve       — approve document
 *   POST   /teachers/:id/sub-brief                     — generate sub brief
 *   POST   /teachers/:id/students/:studentId/conference-prep — conference prep
 *   POST   /teachers/:id/decompression                 — decompression brief
 *
 * Self-care:
 *   POST   /teachers/:id/wellbeing                     — log wellbeing
 *   GET    /teachers/:id/wellbeing                     — wellbeing trend
 *   GET    /teachers/:id/impact                        — celebrate impact
 *   POST   /teachers/:id/guidance                      — new teacher guidance
 *
 * @ssot docs/projects/AMENDMENT_31_TEACHER_OS.md
 */

import express from 'express';
import { createTeacherOSPaperwork } from '../services/teacher-os-paperwork.js';
import { createTeacherOSStudents }  from '../services/teacher-os-students.js';
import { createTeacherOSSelfCare }  from '../services/teacher-os-selfcare.js';

export function createTeacherOSRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  // ── AI helper ──────────────────────────────────────────────────────────────
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  // ── Services ───────────────────────────────────────────────────────────────
  const paperwork = createTeacherOSPaperwork({ pool, callAI });
  const students  = createTeacherOSStudents({ pool, callAI });
  const selfCare  = createTeacherOSSelfCare({ pool, callAI });

  // ── Helper: parse int param ────────────────────────────────────────────────
  function parseId(val) {
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEACHER ACCOUNTS
  // ══════════════════════════════════════════════════════════════════════════

  // POST /teachers — enroll a teacher
  // Body: { display_name, school_name?, district?, state?, grade_levels?, subjects?, class_size_avg?, is_homeschool? }
  router.post('/teachers', requireKey, async (req, res) => {
    try {
      const {
        display_name, school_name, district, state,
        grade_levels, subjects, class_size_avg, is_homeschool,
      } = req.body || {};

      if (!display_name) {
        return res.status(400).json({ ok: false, error: 'display_name is required' });
      }

      const { rows } = await pool.query(
        `INSERT INTO teacher_os_teachers
           (display_name, school_name, district, state, grade_levels, subjects, class_size_avg, is_homeschool)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          display_name,
          school_name || null,
          district || null,
          state || null,
          grade_levels || [],
          subjects || [],
          class_size_avg || 25,
          is_homeschool || false,
        ]
      );

      res.status(201).json({ ok: true, teacher: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /teachers/:id — get teacher record
  router.get('/teachers/:id', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const { rows } = await pool.query('SELECT * FROM teacher_os_teachers WHERE id = $1', [teacherId]);
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Teacher not found' });

      res.json({ ok: true, teacher: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /teachers/:id/dashboard — daily briefing
  router.get('/teachers/:id/dashboard', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const briefing = await selfCare.getDailyBriefing(teacherId);
      res.json({ ok: true, ...briefing });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STUDENTS
  // ══════════════════════════════════════════════════════════════════════════

  // POST /teachers/:id/students — enroll student
  // Body: { display_name, grade_level?, age?, interests? }
  router.post('/teachers/:id/students', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const { display_name, grade_level, age, interests } = req.body || {};
      const student = await students.enrollStudent(teacherId, {
        displayName: display_name,
        gradeLevel: grade_level,
        age,
        interests,
      });
      res.status(201).json({ ok: true, student });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // GET /teachers/:id/students — class roster
  router.get('/teachers/:id/students', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const roster = await students.getClassRoster(teacherId);
      res.json({ ok: true, students: roster, count: roster.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /teachers/:id/students/:studentId — get student
  router.get('/teachers/:id/students/:studentId', requireKey, async (req, res) => {
    try {
      const studentId = parseId(req.params.studentId);
      if (!studentId) return res.status(400).json({ ok: false, error: 'Invalid student id' });

      const student = await students.getStudent(studentId);
      if (!student) return res.status(404).json({ ok: false, error: 'Student not found' });

      res.json({ ok: true, student });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /teachers/:id/students/:studentId/wins — log a student win
  // Body: { win_description, domain? }
  router.post('/teachers/:id/students/:studentId/wins', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      const studentId = parseId(req.params.studentId);
      if (!teacherId || !studentId) return res.status(400).json({ ok: false, error: 'Invalid id' });

      const { win_description, domain } = req.body || {};
      const result = await students.logWin(teacherId, studentId, {
        winDescription: win_description,
        domain,
      });
      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // GET /teachers/:id/belonging — belonging guarantee report
  router.get('/teachers/:id/belonging', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const report = await students.getBelongingReport(teacherId);
      res.json({ ok: true, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /teachers/:id/students/:studentId/entry-points — individualized entry points
  // Body: { subject?, lesson_topic, grade_level? }
  router.post('/teachers/:id/students/:studentId/entry-points', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const { subject, lesson_topic, grade_level } = req.body || {};
      const entryPoints = await students.generateIndividualizedEntryPoints(teacherId, {
        subject,
        lessonTopic: lesson_topic,
        gradeLevel: grade_level,
      });
      res.json({ ok: true, entryPoints, count: entryPoints.length });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /teachers/:id/students/:studentId/flag — flag misidentification pattern
  // Body: { pattern, evidence?, notes? }
  router.post('/teachers/:id/students/:studentId/flag', requireKey, async (req, res) => {
    try {
      const studentId = parseId(req.params.studentId);
      if (!studentId) return res.status(400).json({ ok: false, error: 'Invalid student id' });

      const { pattern, evidence, notes } = req.body || {};
      const updated = await students.flagMisidentification(studentId, { pattern, evidence, notes });
      res.json({ ok: true, student: updated });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // GET /teachers/:id/misidentification — misidentification report
  router.get('/teachers/:id/misidentification', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const report = await students.getMisidentificationReport(teacherId);
      res.json({ ok: true, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ══════════════════════════════════════════════════════════════════════════

  // POST /teachers/:id/documents — generate document
  // Body: { doc_type, subject?, grade_level?, student_id?, additional_context? }
  router.post('/teachers/:id/documents', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const { doc_type, subject, grade_level, student_id, additional_context } = req.body || {};
      const doc = await paperwork.generateDocument(teacherId, {
        docType: doc_type,
        subject,
        gradeLevel: grade_level,
        studentId: student_id ? parseId(student_id) : null,
        additionalContext: additional_context,
      });
      res.status(201).json({ ok: true, document: doc });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // GET /teachers/:id/documents — list documents
  // Query: doc_type?, student_id?, limit?
  router.get('/teachers/:id/documents', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const docs = await paperwork.getDocuments(teacherId, {
        docType: req.query.doc_type || undefined,
        studentId: req.query.student_id ? parseId(req.query.student_id) : undefined,
        limit: parseInt(req.query.limit) || 20,
      });
      res.json({ ok: true, documents: docs, count: docs.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /teachers/:id/documents/:docId/approve — approve document
  router.post('/teachers/:id/documents/:docId/approve', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      const docId = parseId(req.params.docId);
      if (!teacherId || !docId) return res.status(400).json({ ok: false, error: 'Invalid id' });

      const doc = await paperwork.approveDocument(teacherId, docId);
      res.json({ ok: true, document: doc });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // POST /teachers/:id/sub-brief — generate substitute teacher brief
  router.post('/teachers/:id/sub-brief', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const doc = await paperwork.generateSubBrief(teacherId);
      res.status(201).json({ ok: true, document: doc });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // POST /teachers/:id/students/:studentId/conference-prep — conference prep doc
  router.post('/teachers/:id/students/:studentId/conference-prep', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      const studentId = parseId(req.params.studentId);
      if (!teacherId || !studentId) return res.status(400).json({ ok: false, error: 'Invalid id' });

      const doc = await paperwork.generateConferencePrep(teacherId, studentId);
      res.status(201).json({ ok: true, document: doc });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // POST /teachers/:id/decompression — end-of-day decompression brief
  router.post('/teachers/:id/decompression', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const doc = await paperwork.generateDecompressionBrief(teacherId);
      res.status(201).json({ ok: true, document: doc });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SELF-CARE
  // ══════════════════════════════════════════════════════════════════════════

  // POST /teachers/:id/wellbeing — log wellbeing
  // Body: { workload_score, emotional_load_score, notes? }
  router.post('/teachers/:id/wellbeing', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const { workload_score, emotional_load_score, notes } = req.body || {};
      const result = await selfCare.logWellbeing(teacherId, {
        workloadScore: workload_score,
        emotionalLoadScore: emotional_load_score,
        notes,
      });
      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // GET /teachers/:id/wellbeing — wellbeing trend
  // Query: days?
  router.get('/teachers/:id/wellbeing', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const days = parseInt(req.query.days) || 14;
      const trend = await selfCare.getWellbeingTrend(teacherId, days);
      res.json({ ok: true, ...trend });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /teachers/:id/impact — celebrate impact
  router.get('/teachers/:id/impact', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const impact = await selfCare.celebrateImpact(teacherId);
      res.json({ ok: true, ...impact });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // POST /teachers/:id/guidance — new teacher guidance
  // Body: { situation }
  router.post('/teachers/:id/guidance', requireKey, async (req, res) => {
    try {
      const teacherId = parseId(req.params.id);
      if (!teacherId) return res.status(400).json({ ok: false, error: 'Invalid teacher id' });

      const { situation } = req.body || {};
      const result = await selfCare.getNewTeacherGuidance(teacherId, { situation });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  return router;
}
