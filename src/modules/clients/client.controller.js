```javascript
const ClientService = require('./client.service');
const { validationResult } = require('express-validator');

exports.createClient = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const client = await ClientService.createClient(req.body);
    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getClient = async (req, res) => {
  try {
    const client = await ClientService.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.status(200).json(client);
  } catch (error) {
    console.error('Error retrieving client:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateClient = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const client = await ClientService.updateClient(req.params.id, req.body);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.status(200).json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const success = await ClientService.deleteClient(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
```