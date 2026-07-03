```javascript
import React from 'react';
import PropTypes from 'prop-types';

const ProcessDetail = ({ process }) => {
    return (
        <div className="process-detail">
            <h2>{process.name}</h2>
            <p>{process.description}</p>
            {/* Additional details and controls */}
        </div>
    );
};

ProcessDetail.propTypes = {
    process: PropTypes.shape({
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
    }).isRequired,
};

export default ProcessDetail;
```