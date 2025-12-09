import React from 'react';

const SupplyChainVisualizer = ({ shipments }) => {
  return (
    <div>
      <h1>Supply Chain Visualizer</h1>
      <ul>
        {shipments.map((shipment) => (
          <li key={shipment.ID}>
            {shipment.Details} - Status: {shipment.Status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SupplyChainVisualizer;