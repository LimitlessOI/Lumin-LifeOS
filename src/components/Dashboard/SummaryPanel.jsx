```javascript
import React from 'react';

const SummaryPanel = ({ metrics }) => {
  return (
    <div className="summary-panel">
      <h2>Summary</h2>
      <ul>
        {metrics.map((metric, index) => (
          <li key={index}>{metric.name}: {metric.value}</li>
        ))}
      </ul>
    </div>
  );
};

export default SummaryPanel;