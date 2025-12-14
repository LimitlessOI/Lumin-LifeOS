```javascript
const Funnel = require('../models/Funnel');

exports.createFunnel = async (req, res) => {
  try {
    const funnel = await Funnel.create(req.body);
    res.status(201).json(funnel);
  } catch (error) {
    res.status(500).json({ error: 'Error creating funnel' });
  }
};

exports.getFunnels = async (req, res) => {
  try {
    const funnels = await Funnel.findAll();
    res.status(200).json(funnels);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving funnels' });
  }
};

// Add other CRUD operations as needed
```