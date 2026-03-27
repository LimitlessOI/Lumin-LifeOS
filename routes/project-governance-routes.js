/**
 * routes/project-governance-routes.js
 * Project governance API — projects, segments, estimation, pending-adam.
 *
 * Routes:
 *   GET    /api/v1/projects                      list all with hover summary
 *   GET    /api/v1/projects/:id                  full project detail
 *   GET    /api/v1/projects/:id/segments         build plan checklist
 *   POST   /api/v1/projects/:id/segments/:sid    update segment status/hours
 *   POST   /api/v1/projects/:id/verify           run verifier for this project
 *   GET    /api/v1/pending-adam                  everything blocked on Adam
 *   POST   /api/v1/pending-adam                  add a new pending item
 *   POST   /api/v1/pending-adam/:id/resolve      mark resolved
 *   GET    /api/v1/estimation/accuracy           accuracy report
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export function createProjectGovernanceRoutes({ requireKey, pool }) {
  const router = Router();

  // ── GET /api/v1/projects ─────────────────────────────────────────────────
  // Returns all active projects with hover-tooltip summary data
  router.get('/projects', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          p.id, p.slug, p.name, p.lifecycle, p.status, p.priority,
          p.current_focus, p.last_worked_on, p.last_verified_at,
          p.verification_passed, p.estimation_accuracy,
          p.total_segments, p.completed_segments, p.amendment_path,
          ROUND(
            CASE WHEN p.total_segments > 0
              THEN (p.completed_segments::numeric / p.total_segments) * 100
              ELSE 0 END, 1
          ) AS pct_complete,
          (SELECT title FROM project_segments
           WHERE project_id = p.id AND is_next_task = TRUE LIMIT 1) AS next_task,
          (SELECT COUNT(*) FROM pending_adam
           WHERE project_id = p.id AND is_resolved = FALSE) AS pending_count
        FROM projects p
        WHERE p.status NOT IN ('archived')
        ORDER BY
          CASE p.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2
                          WHEN 'normal' THEN 3 ELSE 4 END,
          p.last_worked_on DESC NULLS LAST
      `);
      res.json({ ok: true, projects: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /api/v1/projects/:id ──────────────────────────────────────────────
  // Full project detail including segments, next task, verification state
  router.get('/projects/:id', requireKey, async (req, res) => {
    try {
      const { rows: [project] } = await pool.query(`
        SELECT * FROM projects WHERE slug = $1 OR id::text = $1
      `, [req.params.id]);

      if (!project) return res.status(404).json({ ok: false, error: 'Project not found' });

      const { rows: segments } = await pool.query(`
        SELECT * FROM project_segments
        WHERE project_id = $1
        ORDER BY sort_order ASC, id ASC
      `, [project.id]);

      const { rows: pendingItems } = await pool.query(`
        SELECT * FROM pending_adam
        WHERE project_id = $1 AND is_resolved = FALSE
        ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at
      `, [project.id]);

      const { rows: [accuracy] } = await pool.query(`
        SELECT
          COUNT(*) AS total_logged,
          ROUND(AVG(accuracy_pct), 1) AS avg_accuracy,
          ROUND(AVG(delta_hours), 2) AS avg_delta,
          COUNT(CASE WHEN over_under = 'over' THEN 1 END) AS over_count,
          COUNT(CASE WHEN over_under = 'under' THEN 1 END) AS under_count
        FROM estimation_log WHERE project_id = $1
      `, [project.id]);

      res.json({
        ok: true,
        project,
        segments,
        pendingItems,
        estimationStats: accuracy,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /api/v1/projects/:id/segments ────────────────────────────────────
  router.get('/projects/:id/segments', requireKey, async (req, res) => {
    try {
      const { rows: [project] } = await pool.query(
        `SELECT id FROM projects WHERE slug = $1 OR id::text = $1`, [req.params.id]
      );
      if (!project) return res.status(404).json({ ok: false, error: 'Project not found' });

      const { rows } = await pool.query(`
        SELECT * FROM project_segments
        WHERE project_id = $1
        ORDER BY sort_order ASC, id ASC
      `, [project.id]);

      res.json({ ok: true, segments: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /api/v1/projects/:id/segments/:sid ──────────────────────────────
  // Update a segment — status, actual_hours, is_next_task, blocker_note
  // When status → 'done': records to estimation_log, updates project accuracy
  router.post('/projects/:id/segments/:sid', requireKey, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [project] } = await client.query(
        `SELECT id FROM projects WHERE slug = $1 OR id::text = $1`, [req.params.id]
      );
      if (!project) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'Project not found' }); }

      const { rows: [segment] } = await client.query(
        `SELECT * FROM project_segments WHERE id = $1 AND project_id = $2`,
        [req.params.sid, project.id]
      );
      if (!segment) { await client.query('ROLLBACK'); return res.status(404).json({ ok: false, error: 'Segment not found' }); }

      const {
        status, actual_hours, is_next_task, blocker_note, title, description,
        estimated_hours, stability_class
      } = req.body;

      // Build update
      const sets = [];
      const vals = [];
      let idx = 1;

      if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }
      if (actual_hours !== undefined) { sets.push(`actual_hours = $${idx++}`); vals.push(actual_hours); }
      if (is_next_task !== undefined) { sets.push(`is_next_task = $${idx++}`); vals.push(is_next_task); }
      if (blocker_note !== undefined) { sets.push(`blocker_note = $${idx++}`); vals.push(blocker_note); }
      if (title !== undefined) { sets.push(`title = $${idx++}`); vals.push(title); }
      if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description); }
      if (estimated_hours !== undefined) { sets.push(`estimated_hours = $${idx++}`); vals.push(estimated_hours); }
      if (stability_class !== undefined) { sets.push(`stability_class = $${idx++}`); vals.push(stability_class); }

      // Timestamps
      if (status === 'in_progress' && segment.status !== 'in_progress') {
        sets.push(`started_at = NOW()`);
      }
      if (status === 'done' && segment.status !== 'done') {
        sets.push(`completed_at = NOW()`);
      }

      if (sets.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ ok: false, error: 'No fields to update' });
      }

      vals.push(req.params.sid);
      const { rows: [updated] } = await client.query(
        `UPDATE project_segments SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
      );

      // If is_next_task set to true, clear it on all other segments in this project
      if (is_next_task === true) {
        await client.query(
          `UPDATE project_segments SET is_next_task = FALSE WHERE project_id = $1 AND id != $2`,
          [project.id, req.params.sid]
        );
      }

      // Estimation log: when marked done with actual_hours
      const finalActual = actual_hours ?? segment.actual_hours;
      const finalEst = estimated_hours ?? segment.estimated_hours;

      if (status === 'done' && finalActual != null && finalEst != null && parseFloat(finalEst) > 0) {
        const est = parseFloat(finalEst);
        const act = parseFloat(finalActual);
        const delta = act - est;
        const accuracyPct = Math.max(0, Math.min(100, (1 - Math.abs(delta) / est) * 100));
        const overUnder = Math.abs(delta) < 0.05 ? 'exact' : delta > 0 ? 'over' : 'under';

        await client.query(`
          INSERT INTO estimation_log (project_id, segment_id, estimated_hours, actual_hours, accuracy_pct, over_under, delta_hours)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [project.id, segment.id, est, act, accuracyPct.toFixed(2), overUnder, delta.toFixed(2)]);

        // Update running accuracy on project
        await client.query(`
          UPDATE projects SET
            estimation_accuracy = (
              SELECT ROUND(AVG(accuracy_pct), 2) FROM estimation_log WHERE project_id = $1
            )
          WHERE id = $1
        `, [project.id]);
      }

      // Update completed_segments count
      const { rows: [counts] } = await client.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'done' THEN 1 END) AS done
        FROM project_segments WHERE project_id = $1
      `, [project.id]);

      await client.query(`
        UPDATE projects SET
          total_segments = $1,
          completed_segments = $2,
          last_worked_on = NOW()
        WHERE id = $3
      `, [counts.total, counts.done, project.id]);

      await client.query('COMMIT');
      res.json({ ok: true, segment: updated });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ ok: false, error: err.message });
    } finally {
      client.release();
    }
  });

  // ── POST /api/v1/projects/:id/verify ─────────────────────────────────────
  // Runs verify-project.mjs for this project
  router.post('/projects/:id/verify', requireKey, async (req, res) => {
    try {
      const { rows: [project] } = await pool.query(
        `SELECT slug FROM projects WHERE slug = $1 OR id::text = $1`, [req.params.id]
      );
      if (!project) return res.status(404).json({ ok: false, error: 'Project not found' });

      const { stdout, stderr } = await execFileAsync(
        'node', [path.join(ROOT, 'scripts/verify-project.mjs'), '--project', project.slug, '--quiet'],
        { cwd: ROOT, timeout: 30000, env: { ...process.env } }
      ).catch(e => ({ stdout: e.stdout || '', stderr: e.stderr || '', exitCode: e.code }));

      const passed = !stderr?.includes('FAIL') && !stdout?.includes('FAIL');
      res.json({ ok: true, passed, output: stdout + stderr });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /api/v1/pending-adam ──────────────────────────────────────────────
  router.get('/pending-adam', requireKey, async (req, res) => {
    try {
      const showResolved = req.query.resolved === 'true';
      const { rows } = await pool.query(`
        SELECT pa.*, p.name AS project_name, p.slug AS project_slug
        FROM pending_adam pa
        LEFT JOIN projects p ON pa.project_id = p.id
        WHERE pa.is_resolved = $1
        ORDER BY
          CASE pa.priority WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
          pa.created_at ASC
      `, [showResolved]);
      res.json({ ok: true, items: rows, total: rows.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /api/v1/pending-adam ─────────────────────────────────────────────
  // Create a new pending-adam item (called by system when it needs something)
  router.post('/pending-adam', requireKey, async (req, res) => {
    try {
      const { project_slug, title, description, type = 'approval', priority = 'normal', context } = req.body;
      if (!title) return res.status(400).json({ ok: false, error: 'title is required' });
      if (!type) return res.status(400).json({ ok: false, error: 'type is required' });

      let projectId = null;
      if (project_slug) {
        const { rows: [p] } = await pool.query(`SELECT id FROM projects WHERE slug = $1`, [project_slug]);
        projectId = p?.id || null;
      }

      const { rows: [item] } = await pool.query(`
        INSERT INTO pending_adam (project_id, project_slug, title, description, type, priority, context)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [projectId, project_slug, title, description, type, priority, context ? JSON.stringify(context) : null]);

      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /api/v1/pending-adam/:id/resolve ────────────────────────────────
  router.post('/pending-adam/:id/resolve', requireKey, async (req, res) => {
    try {
      const { resolved_notes, resolved_by = 'adam' } = req.body;
      const { rows: [item] } = await pool.query(`
        UPDATE pending_adam
        SET is_resolved = TRUE, resolved_at = NOW(), resolved_by = $1, resolved_notes = $2
        WHERE id = $3
        RETURNING *
      `, [resolved_by, resolved_notes || null, req.params.id]);

      if (!item) return res.status(404).json({ ok: false, error: 'Item not found' });
      res.json({ ok: true, item });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /api/v1/estimation/accuracy ──────────────────────────────────────
  router.get('/estimation/accuracy', requireKey, async (req, res) => {
    try {
      const { rows: overall } = await pool.query(`
        SELECT
          COUNT(*) AS total_logged,
          ROUND(AVG(accuracy_pct), 1) AS overall_accuracy_pct,
          ROUND(AVG(delta_hours), 2) AS avg_delta_hours,
          COUNT(CASE WHEN over_under = 'over' THEN 1 END) AS over_count,
          COUNT(CASE WHEN over_under = 'under' THEN 1 END) AS under_count,
          COUNT(CASE WHEN over_under = 'exact' THEN 1 END) AS exact_count
        FROM estimation_log
      `);

      const { rows: byProject } = await pool.query(`
        SELECT
          p.name, p.slug,
          COUNT(el.*) AS logged,
          ROUND(AVG(el.accuracy_pct), 1) AS accuracy_pct,
          ROUND(AVG(el.delta_hours), 2) AS avg_delta
        FROM estimation_log el
        JOIN projects p ON el.project_id = p.id
        GROUP BY p.id, p.name, p.slug
        ORDER BY accuracy_pct DESC
      `);

      const { rows: trend } = await pool.query(`
        SELECT
          DATE_TRUNC('week', logged_at) AS week,
          ROUND(AVG(accuracy_pct), 1) AS avg_accuracy,
          COUNT(*) AS samples
        FROM estimation_log
        GROUP BY 1 ORDER BY 1 DESC
        LIMIT 12
      `);

      res.json({ ok: true, overall: overall[0], byProject, trend });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
