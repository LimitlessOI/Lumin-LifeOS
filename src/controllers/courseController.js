const express = require('express');
const Course = require('../models/Course');
const stripeService = require('../services/stripeCourseService');
const incomeDroneService = require('../services/incomeDroneCourseService');

const router = express.Router();

router.post('/courses', async (req, res) => {
  try {
    const course = new Course(req.body);
    // Save course to DB (mocked for this example)
    // const savedCourse = await db('courses').insert(course);
    const savedCourse = course; // Simulate save
    res.status(201).json(savedCourse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/courses/:id/publish', async (req, res) => {
  try {
    const courseId = req.params.id;
    // Mock fetching course from DB
    const course = { id: courseId, ...req.body, published: true };
    await stripeService.createStripeProduct(course);
    await incomeDroneService.linkToIncomeDrone(course);
    res.status(200).json(course);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;