```jsx
import React from 'react';
import PropTypes from 'prop-types';

const InsightFilters = ({ filter, setFilter }) => {
  const handleTypeChange = (event) => {
    setFilter({...filter, type: event.target.value});
  };

  const handleConfidenceChange = (event) => {
    setFilter({...filter, confidence: Number(event.target.value)});
  };

  return (
    <div className="insight-filters">
      <select value={filter.type} onChange={handleTypeChange}>
        <option value="">All Types</option>
        <option value="bug">Bug</option>
        <option value="code-smell">Code Smell</option>
        {/* Add more types as necessary */}
      </select>
      <input
        type="number"
        min="0"
        max="1"
        step="0.1"
        value={filter.confidence}
        onChange={handleConfidenceChange}
        placeholder="Min Confidence"
      />
    </div>
  );
};

InsightFilters.propTypes = {
  filter: PropTypes.shape({
    type: PropTypes.string,
    confidence: PropTypes.number
  }).isRequired,
  setFilter: PropTypes.func.isRequired
};

export default InsightFilters;
```