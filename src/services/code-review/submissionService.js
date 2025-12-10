```javascript
const { CodeSubmission, SupportedLanguage } = require('../../models');
const { v4: uuidv4 } = require('uuid');

class SubmissionService {
  async createSubmission(userId, languageId, code) {
    return CodeSubmission.create({
      id: uuidv4(),
      userId,
      languageId,
      code,
      status: 'pending',
    });
  }

  async getSubmission(id) {
    return CodeSubmission.findByPk(id);
  }

  async listSubmissions(userId) {
    return CodeSubmission.findAll({ where: { userId } });
  }

  async updateSubmissionStatus(id, status, result = null) {
    return CodeSubmission.update(
      { status, result },
      { where: { id } }
    );
  }
}

module.exports = new SubmissionService();
```