```javascript
const Project = require('./models/Project');
const Analytics = require('./models/Analytics');
const { reviewCode } = require('./ai/reviewer');

exports.submitProject = async (req, res) => {
    try {
        const { name, description, repository_url } = req.body;
        const project = await Project.create({ name, description, repository_url });
        // Enqueue project review task
        await reviewCode(project.id);
        res.status(201).json({ message: 'Project submitted for review', project });
    } catch (error) {
        console.error('Error submitting project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getProjectAnalytics = async (req, res) => {
    try {
        const { projectId } = req.params;
        const analytics = await Analytics.findOne({ where: { project_id: projectId } });
        if (!analytics) {
            return res.status(404).json({ error: 'Analytics not found for this project' });
        }
        res.json(analytics);
    } catch (error) {
        console.error('Error fetching project analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
```