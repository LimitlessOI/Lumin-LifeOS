<!-- SYNOPSIS: Documentation — Amendment 46 Builderos Control Plane Proof G227 100. -->

// routes/lifeos-council-builder-routes.js
import { Router } from 'express';
import { recordBuildStart, recordBuildComplete, canMarkBuildDone, getSystemHealth } from '../src/controllers/builderController.js'; // Assuming path

const router = Router();

// POST /build/start
router.post('/build/start',