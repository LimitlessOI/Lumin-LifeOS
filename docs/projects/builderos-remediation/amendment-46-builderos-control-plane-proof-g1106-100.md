// routes/lifeos-council-builder-routes.js
import express from 'express';
import * as builderosController from '../controllers/builderos-controller.js'; // Assuming this controller exists or will be created

const router = express.Router();

/**
 * @route POST /build/start
 * @description Records the start of a BuilderOS build process