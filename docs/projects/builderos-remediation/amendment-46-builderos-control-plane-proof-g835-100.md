import express from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/builderService.js'; // Assuming builderService.js exists and exports these functions

const router = express.Router();

/**
 * @route POST /build/start
 * @description Records the start of a