```javascript
import express from 'express';
import WorkflowEngine from '../execution/WorkflowEngine';

const router = express.Router();

router.post('/execute-workflow', async (req, res) => {
  try {
    const result = await WorkflowEngine.execute(req.body);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```