const { generateQuantumCircuit, submitQuantumJob } = require('./quantumProcessor');

test('Quantum circuit generation', async () => {
  const circuit = await generateQuantumCircuit();
  expect(circuit).toBeDefined();
});

test('Submit quantum job', async () => {
  const circuit = await generateQuantumCircuit();
  const jobId = await submitQuantumJob(circuit);
  expect(jobId).toBeDefined();
});