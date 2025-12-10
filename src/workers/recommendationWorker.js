```javascript
exports.process = async (job) => {
    try {
        console.log('Processing job:', job.id, 'with data:', job.data);
        // Implement job processing logic here
    } catch (error) {
        console.error('Error processing job:', error);
        throw error;
    }
};
```