```javascript
const { QuantumCircuit } = require('qiskit');
const { execute } = require('ibm-quantum');

async function runQuantumSimulation() {
    let qc = new QuantumCircuit(2, 'qasm_simulator');
    qc.h(0);
    qc.cx(0, 1);
    qc.measure_all();

    const result = await execute(qc);
    console.log('Quantum Simulation Results:', result);
    return result;
}

module.exports = { runQuantumSimulation };
```