import { Router } from 'express';
import { recordBuildStart, recordBuildComplete, canMarkBuildDone } from '../services/builderService.js'; // Assuming builderService exists

const router = Router();

/**
 * @route POST /build/start
 * @description Records the start of a BuilderOS build task.
 * @body {string} task_id