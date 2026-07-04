/**
 * SYNOPSIS: Exports createCourseRoutes — routes/course-routes.js.
 */
import express from 'express';
import { createCourseService } from '../services/course-service.js';

export function createCourseRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const courses = createCourseService({ pool });

  router.post('/api/v1/courses', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { title, description } = req.body || {};
      const course = await courses.createCourse({ title, description, ownerId });
      res.json({ ok: true, course });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/api/v1/courses', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const coursesList = await courses.listCourses({ limit: req.query?.limit });
      res.json({ ok: true, courses: coursesList });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/courses/:id', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const course = await courses.getCourse(req.params.id);
      res.json({ ok: true, course });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  return router;
}