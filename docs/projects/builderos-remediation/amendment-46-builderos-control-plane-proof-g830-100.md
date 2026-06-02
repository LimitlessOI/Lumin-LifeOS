import express from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  getSystemHealthStatus
} from '../services/builderControlService.js'; // Assuming these services exist

const router = express.Router();

// Middleware for basic payload validation
const validateBuildStartPayload = (req, res