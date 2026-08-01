/**
 * SYNOPSIS: Registers AccreditationConsultationRoutes routes/handlers (routes/accreditationConsultationRoutes.js).
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
import { scheduleConsultation, getConsultationDetails } from '../services/accreditationConsultation.js';

export function registerAccreditationConsultationRoutes(app, deps) {
  const { logger, requireKey } = deps;

  /**
   * POST /accreditation-consultation/schedule
   * Schedules a preliminary accreditation body consultation.
   * Requires a command key.
   */
  app.post('/accreditation-consultation/schedule', requireKey, async (req, res) => {
    try {
      const result = await scheduleConsultation(deps, req.body);
      if (result) {
        res.status(201).json(result);
      } else {
        res.status(400).json({ message: 'Failed to schedule consultation due to invalid input.' });
      }
    } catch (error) {
      logger.error({ error, body: req.body }, 'Route error: POST /accreditation-consultation/schedule');
      res.status(500).json({ message: 'Internal server error during consultation scheduling.' });
    }
  });

  /**
   * GET /accreditation-consultation/:id
   * Retrieves details for a scheduled consultation.
   * Requires a command key.
   */
  app.get('/accreditation-consultation/:id', requireKey, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await getConsultationDetails(deps, { id });
      if (result) {
        res.status(200).json(result);
      } else {
        res.status(404).json({ message: 'Consultation not found.' });
      }
    } catch (error) {
      logger.error({ error, params: req.params }, 'Route error: GET /accreditation-consultation/:id');
      res.status(500).json({ message: 'Internal server error while retrieving consultation details.' });
    }
  });
}