```javascript
import React from 'react';
import PropTypes from 'prop-types';

const ProcessCard = ({ process }) => {
    return (
        <div className="process-card">
            <h3>{process.name}</h3>
            <p>{process.description}</p>
        </div>
    );
};

ProcessCard.propTypes = {
    process: PropTypes.shape({
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
    }).isRequired,
};

export default ProcessCard;
```