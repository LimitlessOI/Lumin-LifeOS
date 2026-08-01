/**
 * SYNOPSIS: Project drawer details API route.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
import { getProjectDetails } from '../services/projectService.js'; // Assuming a service exists for project details
export function registerProjectDrawerDetail(app, deps) {
  app.get('/api/v1/project/drawer', deps.requireKey, async (req, res, next) => {
    try {
      const { id } = req.query; // Changed from req.params to req.query based on typical GET request patterns for IDs
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required.' });
      }
      const project = await getProjectDetails(deps, { id }); // Renamed result to project for clarity
      if (!project) {
        return res.status(404).json({ error: 'Project not found.' });
      }
      res.json({ project });
    } catch (error) {
      deps.logger.error({ error }, 'Error in projectDrawerDetail route');
      next(error);
    }
  });
}