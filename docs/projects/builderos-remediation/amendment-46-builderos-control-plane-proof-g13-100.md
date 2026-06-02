// routes/lifeos-council-builder-routes.js
import express from 'express';
import {
  recordBuildStart,
  recordBuildComplete,
  canMarkBuildDone,
  getBuilderHealthStatus // Assuming a function to get health status
} from '../services/builderControlService.js'; // Assuming this service file exists

const router = express