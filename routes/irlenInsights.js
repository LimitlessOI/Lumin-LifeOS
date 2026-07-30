/**
 * SYNOPSIS: GET /api/irlen-insights
 */
import { Router } from 'express';

const router = Router();

// In a real application, this data would come from a database or a service.
const mockIrlenInsights = [
  {
    id: 'insight-1',
    consultationId: 'consult-001',
    date: '2023-10-26',
    summary: 'Initial assessment indicates potential for improved reading comfort with colored overlays.',
    recommendations: [
      'Experiment with rose and aqua overlays.',
      'Schedule follow-up for detailed color testing.'
    ]
  },
  {
    id: 'insight-2',
    consultationId: 'consult-002',
    date: '2023-11-15',
    summary: 'Patient reports significant reduction in eyestrain with aqua overlay.',
    recommendations: [
      'Consider prescription lenses with aqua tint.',
      'Monitor for long-term benefits and adjust as needed.'
    ]
  },
  {
    id: 'insight-3',
    consultationId: 'consult-003',
    date: '2023-12-01',
    summary: 'Follow-up on aqua tint lenses. Patient notes improved focus during prolonged reading tasks.',
    recommendations: [
      'Maintain current lens prescription.',
      'Advise on environmental lighting adjustments for optimal comfort.'
    ]
  }
];

/**
 * GET /api/irlen-insights
 * Fetches all Irlen consultation insights.
 */
router.get('/irlen-insights', (req, res) => {
  res.status(200).json(mockIrlenInsights);
});

/**
 * GET /api/irlen-insights/:id
 * Fetches a single Irlen consultation insight by ID.
 */
router.get('/irlen-insights/:id', (req, res) => {
  const { id } = req.params;
  const insight = mockIrlenInsights.find(i => i.id === id);

  if (insight) {
    res.status(200).json(insight);
  } else {
    res.status(404).json({ message: 'Irlen insight not found.' });
  }
});

export function registerIrlenInsightsRoutes(app) {
  app.use('/api', router);
}