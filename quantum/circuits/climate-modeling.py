```python
from qiskit import QuantumCircuit, Aer, transpile, assemble
from qiskit.visualization import plot_histogram
from cirq import Circuit, X, measure, Simulator

def create_quantum_circuit():
    # Qiskit example
    qc = QuantumCircuit(2)
    qc.h(0)  # Apply Hadamard gate
    qc.cx(0, 1)  # Apply CNOT gate
    qc.measure_all()

    # Execute the circuit
    simulator = Aer.get_backend('qasm_simulator')
    transpiled_circuit = transpile(qc, simulator)
    qobj = assemble(transpiled_circuit)
    result = simulator.run(qobj).result()
    counts = result.get_counts()

    plot_histogram(counts)
    return counts

def cirq_example():
    # Cirq example
    qubit = cirq.LineQubit(0)
    circuit = Circuit(X(qubit), measure(qubit, key='result'))
    simulator = Simulator()
    result = simulator.run(circuit, repetitions=20)
    print(result)
    return result

if __name__ == "__main__":
    create_quantum_circuit()
    cirq_example()
```