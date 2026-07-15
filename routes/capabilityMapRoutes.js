/**
 * SYNOPSIS: HTTP route module — CapabilityMapRoutes.
 */
import express from 'express';

const capabilityData = [];

function getCapabilityMap(req, res) {
  res.json(capabilityData);
}

function addCapability(req, res) {
  const capability = req.body;
  capabilityData.push(capability);
  res.status(201).json(capability);
}

function updateCapability(req, res) {
  const { id } = req.params;
  const capability = req.body;
  const index = capabilityData.findIndex((c) => c.id === id);
  if (index !== -1) {
    capabilityData[index] = capability;
    res.json(capability);
  } else {
    res.status(404).send('Capability not found');
  }
}

function deleteCapability(req, res) {
  const { id } = req.params;
  const index = capabilityData.findIndex((c) => c.id === id);
  if (index !== -1) {
    capabilityData.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).send('Capability not found');
  }
}

function registerCapabilityMapRoutes(app) {
  const router = express.Router();

  router.get('/capabilities', getCapabilityMap);
  router.post('/capabilities', addCapability);
  router.put('/capabilities/:id', updateCapability);
  router.delete('/capabilities/:id', deleteCapability);

  app.use('/api', router);
}

export { registerCapabilityMapRoutes };