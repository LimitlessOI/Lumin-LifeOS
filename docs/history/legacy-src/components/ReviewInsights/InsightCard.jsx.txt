```jsx
import React from 'react';
import PropTypes from 'prop-types';
import './InsightCard.css';

const InsightCard = ({ insight }) => {
  return (
    <div className="insight-card">
      <h3>{insight.type}</h3>
      <p>{insight.insight_text}</p>
      <small>Confidence: {insight.confidence_score}</small>
    </div>
  );
};

InsightCard.propTypes = {
  insight: PropTypes.shape({
    type: PropTypes.string.isRequired,
    insight_text: PropTypes.string.isRequired,
    confidence_score: PropTypes.number.isRequired
  }).isRequired
};

export default InsightCard;
```