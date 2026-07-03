from qiskit import QuantumCircuit

def create_variational_circuit(num_qubits):
    circuit = QuantumCircuit(num_qubits)
    for i in range(num_qubits):
        circuit.h(i)
        circuit.rz(0.1, i)
    return circuit