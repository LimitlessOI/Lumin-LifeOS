```javascript
const { Lesson, LessonProgress } = require('../models');

exports.createLesson = async (req, res) => {
    try {
        const lesson = await Lesson.create(req.body);
        res.status(201).json(lesson);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getLessons = async (req, res) => {
    try {
        const lessons = await Lesson.findAll();
        res.status(200).json(lessons);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByPk(req.params.id, {
            include: ['progress']
        });
        if (lesson) {
            res.status(200).json(lesson);
        } else {
            res.status(404).json({ error: 'Lesson not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.updateLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByPk(req.params.id);
        if (lesson) {
            await lesson.update(req.body);
            res.status(200).json(lesson);
        } else {
            res.status(404).json({ error: 'Lesson not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findByPk(req.params.id);
        if (lesson) {
            await lesson.destroy();
            res.status(204).end();
        } else {
            res.status(404).json({ error: 'Lesson not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
```