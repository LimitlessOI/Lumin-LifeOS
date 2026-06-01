// src/data/schemas/LifeCoachingSession.js
import mongoose from 'mongoose';

const LifeCoachingSessionSchema = new mongoose.Schema({
  // Mongoose automatically adds an _id field which can serve as sessionId
  // If a distinct sessionId is required, it can be added here and indexed.
  // For this slice, we'll use _id as the primary identifier.
  coachId: {
    type: String, // Assuming UUID string
    required: true,
    index: true,
  },
  clientId: {
    type: String, // Assuming UUID string
    required: true,
    index: true,
  },
  scheduledTime: {
    type: Date,
    required: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1, // Sessions must have a positive duration
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled',
    required: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Optionally, if a specific 'sessionId' field is strictly required by the blueprint
// and should be distinct from _id, we could add a pre-save hook or a virtual.
// For now, we'll assume _id serves this purpose as is common in MongoDB.
// If the blueprint implies a user-facing 'sessionId' distinct from the internal _id,
// this would be the place to add it, e.g., `sessionId: { type: String, unique: true, required: true }`
// and generate it in the service layer.

const LifeCoachingSession = mongoose.model('LifeCoachingSession', LifeCoachingSessionSchema);

export default LifeCoachingSession;

// src/services/lifeCoachingService.js
import LifeCoachingSession from '../data/schemas/LifeCoachingSession.js';

/**
 * Creates a new life coaching session record.
 * @param {object} sessionData - The data for the new session.
 * @param {string} sessionData.coachId - The ID of the coach.
 * @param {string} sessionData.clientId - The ID of the client.
 * @param {string} sessionData.scheduledTime - ISO 8601 string for the scheduled time.
 * @param {number} sessionData.durationMinutes - Duration of the session in minutes.
 * @returns {Promise<object>} The newly created session object.
 * @throws {Error} If session creation fails or data is invalid.
 */
export const createSession = async (sessionData) => {
  const { coachId, clientId, scheduledTime, durationMinutes } = sessionData;

  if (!coachId || !clientId || !scheduledTime || !durationMinutes) {
    throw new Error('Missing required session data fields.');
  }

  if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
    throw new Error('Duration must be a positive number.');
  }

  try {
    const newSession = new LifeCoachingSession({
      coachId,
      clientId,
      scheduledTime: new Date(scheduledTime),
      durationMinutes,
      status: 'scheduled', // Default status as per blueprint
    });

    await newSession.save();
    return newSession;
  } catch (error) {
    console.error('Error creating life coaching session:', error);
    throw new Error(`Failed to create session: ${error.message}`);
  }
};

// src/api/v1/lifeCoachingRoutes.js
import { Router } from 'express';
import { createSession } from '../services/lifeCoachingService.js';
// Assuming an authentication middleware exists and is imported
// import { authMiddleware } from '../../middleware/authMiddleware.js'; // Placeholder

const router = Router();

/**
 * @swagger
 * /api/v1/life-coaching/sessions:
 *   post:
 *     summary: Schedule a new life coaching session
 *     tags: [Life Coaching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coachId
 *               - clientId
 *               - scheduledTime
 *               - durationMinutes
 *             properties:
 *               coachId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the coach.
 *               clientId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the client.
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 formatted date and time for the session.
 *               durationMinutes:
 *                 type: number
 *                 description: Duration of the session in minutes.
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Session successfully scheduled.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The unique ID of the session.
 *                 coachId:
 *                   type: string
 *                 clientId:
 *                   type: string
 *                 scheduledTime:
 *                   type: string
 *                   format: date-time
 *                 durationMinutes:
 *                   type: number
 *                 status:
 *                   type: string
 *                   enum: [scheduled, completed, cancelled, rescheduled]
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request payload.
 *       500:
 *         description: Internal server error.
 */
router.post('/sessions', /* authMiddleware, */ async (req, res) => {
  try {
    const sessionData = req.body;
    const newSession = await createSession(sessionData);
    res.status(201).json(newSession);
  } catch (error) {
    if (error.message.includes('Missing required') || error.message.includes('Duration must be')) {
      return res.status(400).json({ message: error.message });
    }
    console.error('API Error scheduling life coaching session:', error);
    res.status(500).json({ message: 'Failed to schedule session due to an internal server error.' });
  }
});

export default router;

// src/api/v1/index.js
import { Router } from 'express';
import lifeCoachingRoutes from './lifeCoachingRoutes.js';
// Assuming other routes are imported here as well, e.g.,
// import userRoutes from './userRoutes.js';
// import healthRoutes from './healthRoutes.js';

const router = Router();

// Register other routes here
// router.use('/users', userRoutes);
// router.use('/health', healthRoutes);

// Register the new life coaching routes
router.use('/life-coaching', lifeCoachingRoutes);

export default router;