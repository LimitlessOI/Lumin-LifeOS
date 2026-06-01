// src/models/CoachProfile.js
const mongoose = require('mongoose');

const coachProfileSchema = new mongoose.Schema({
  name: String,
  email: String,
  specialties: [String]
});

module.exports = mongoose.model('CoachProfile', coachProfileSchema);

// src/services/coachProfileService.js
const CoachProfile = require('./CoachProfile');

const createCoachProfile = async (coachProfile) => {
  try {
    const newCoachProfile = new CoachProfile(coachProfile);
    await newCoachProfile.save();
    return newCoachProfile;
  } catch (error) {
    throw error;
  }
};

module.exports = { createCoachProfile };

// src/routes/coachProfiles.js
const express = require('express');
const router = express.Router();
const { createCoachProfile } = require('./coachProfileService');

router.post('/api/v1/coach-profiles', async (req, res) => {
  try {
    const coachProfile = req.body;
    const newCoachProfile = await createCoachProfile(coachProfile);
    res.status(201).json(newCoachProfile);
  } catch (error) {
    res.status(500).json({ message: 'Error creating coach profile' });
  }
});

module.exports = router;

// src/app.js
const express = require('express');
const app = express();
const coachProfilesRouter = require('./routes/coachProfiles');

app.use('/api/v1/coach-profiles', coachProfilesRouter);

module.exports = app;