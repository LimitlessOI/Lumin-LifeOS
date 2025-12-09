const express = require('express');
const jwt = require('jsonwebtoken');

class ThirdPartyIntegrationService {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.post('/api/integrate', this.verifyToken, (req, res) => {
      const { data } = req.body;
      // Process third-party data
      res.status(200).json({ message: 'Integration successful' });
    });
  }

  verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(500).json({ message: 'Failed to authenticate token' });
      req.userId = decoded.id;
      next();
    });
  }
}

module.exports = new ThirdPartyIntegrationService();