const Client = require('../models/Client');
const Joi = require('joi');

const clientSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
});

async function createClient(req, res) {
  const { error } = clientSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getClients(req, res) {
  try {
    const clients = await Client.findAll();
    res.status(200).json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createClient, getClients };