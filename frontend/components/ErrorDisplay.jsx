```javascript
import React from 'react';
import PropTypes from 'prop-types';
import './ErrorDisplay.css';

function ErrorDisplay({ error }) {
    return <div className="error-display">Error: {error}</div>;
}

ErrorDisplay.propTypes = {
    error: PropTypes.string.isRequired
};

export default ErrorDisplay;
```