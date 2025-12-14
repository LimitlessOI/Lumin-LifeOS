```javascript
const { Interaction, SupportTicket } = require('../models');

// Interaction Controllers
exports.createInteraction = async (req, res) => {
  try {
    const interaction = await Interaction.create(req.body);
    res.status(201).json(interaction);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getInteraction = async (req, res) => {
  try {
    const interaction = await Interaction.findByPk(req.params.id);
    if (interaction) {
      res.json(interaction);
    } else {
      res.status(404).json({ error: 'Interaction not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Additional CRUD methods for Interaction...

// SupportTicket Controllers
exports.createSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.create(req.body);
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (ticket) {
      res.json(ticket);
    } else {
      res.status(404).json({ error: 'Support Ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Additional CRUD methods for SupportTicket...
```