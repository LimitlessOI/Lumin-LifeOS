/**
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import express from 'express';
import { createHabitsStreakService } from '../services/lifeos-habits-streaks.js';

export function createLifeOSHabitsRoutes({ pool, *rk, *ccm, logger }) {