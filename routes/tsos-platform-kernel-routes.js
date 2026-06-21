/**
 * SYNOPSIS: TSOS Platform Kernel API routes.
 * TSOS Platform Kernel API routes.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import { Router } from 'express';

export function createTSOSPlatformKernelRoutes({ requireKey, platformKernel }) {
  const router = Router();
  router.use(requireKey);

  router.get('/health', async (_req, res) => {
    try {
      const health = await platformKernel.getKernelHealth();
      res.json({ ok: true, ...health });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/verify', async (_req, res) => {
    try {
      const health = await platformKernel.getKernelHealth();
      const pass = Boolean(platformKernel?.kernelExecute && platformKernel?.wrapCouncilMember);
      res.json({
        ok: pass,
        status: pass ? (health.status === 'RED' ? 'PARTIAL' : 'PASS') : 'FAIL',
        kernel_phase: 'phase0',
        health,
      });
    } catch (err) {
      res.status(500).json({ ok: false, status: 'FAIL', error: err.message });
    }
  });

  return router;
}
