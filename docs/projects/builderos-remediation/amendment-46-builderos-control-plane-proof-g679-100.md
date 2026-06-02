import { Router } from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
} from '../services/builder-control-plane-service.js'; // Assuming this service exists or will be created

const router = Router();

/**
 * @route POST /build/start
 * @description