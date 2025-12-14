```javascript
const submissionService = require('../services/code-review/submissionService');
const analysisEngine = require('../services/code-review/analysisEngine');

class CodeReviewController {
  async submitCode(req, res) {
    const { languageId, code } = req.body;
    const userId = req.user.id;

    try {
      const submission = await submissionService.createSubmission(userId, languageId, code);
      // Assume some async processing, e.g., adding to a queue
      res.status(201).json({ message: 'Submission received', submissionId: submission.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async listSubmissions(req, res) {
    const userId = req.user.id;

    try {
      const submissions = await submissionService.listSubmissions(userId);
      res.status(200).json(submissions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getSubmission(req, res) {
    const { id } = req.params;

    try {
      const submission = await submissionService.getSubmission(id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }
      res.status(200).json(submission);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new CodeReviewController();
```