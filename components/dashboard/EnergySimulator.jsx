import React, { useState } from 'react';

function EnergySimulator() {
    const [simulationData, setSimulationData] = useState(null);

    const runSimulation = () => {
        // Mock simulation logic
        setSimulationData({ result: 'Simulation Complete', details: {} });
    };

    return (
        <div>
            <h2>Energy Trading Simulator</h2>
            <button onClick={runSimulation}>Run Simulation</button>
            {simulationData && <pre>{JSON.stringify(simulationData, null, 2)}</pre>}
        </div>
    );
}

export default EnergySimulator;