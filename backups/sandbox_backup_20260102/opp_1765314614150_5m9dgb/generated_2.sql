const express = require('express');
const { check, validationResult } = require('express-validator');
const CoursesService = require('../services/CoursesService'); // Assume this service handles all CRUD operations and AI content generation for courses 

const router = new express.Router();

router.get('/', async (req, res) => {
    try {
        const courses = await CoursesService.findAll({});
        return res.status(200).json(courses);
    } catch (error) {
        return res.status(400).send(error.message);
    }
});

router.get('/:id', async (req, res) => {
    try {
        const course = await CoursesService.findOne({ id: req.params.id });
        if (!course) return res.status(404).send('Course not found');
        
        // Retrieve and include AI-generated content snippet in response (assuming this is already handled within the service layer):
        course.ai_snippet = course.ai_generated_content; 
        return res.status(200).json(course);
    } catch (error) {
        return res.status(400).send(error.message);
    end File===

router.post('/', [check('title').isString().not().isEmpty(), check('description').isString()], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isValid()) return; // If there are any validation errors in the request body:
    
    try {
        await CoursesService.create({ ...req.body });
        return res.status(201).send('Course created');
    } catch (error) {
        console.log(errors); // Handle and log any validation errors here if needed before responding to the client 
        return res.status(400).json({ message: 'Error creating course', error }); end File===

router.put('/:id', async (req, res) => {
    try {
        const updatedCourse = await CoursesService.update(req.params.id, req.body);
        
        if (!updatedCourse) return res.status(404).send('Course not found'); 
        // Assuming the service updates and returns AI-generated content on success:
        updatedCourse.ai_snippet = course.ai_generated_content;  
        
        return res.json(updatedCourse); end File===
});

router.delete('/:id', async (req, res) => {
    try {
        await CoursesService.remove({ id: req.params.id });
        return res.status(204).send(); // No content sent back to the client as per REST convention for DELETE requests 
    } catch (error) {
        console.log(errors);  
        return res.status(500).json({ message: 'Error removing course' }); end File===

module.exports = router; // Export this file to be used in the Express app setup on Railway production environment 
===END FILE===

### Frontend Components (Vue/React) - `src/components/CourseListingPage.vue` or similar Vue component for React, depending on choice of frontend framework