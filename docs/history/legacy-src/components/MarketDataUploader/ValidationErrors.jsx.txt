import React from 'react';

const ValidationErrors = ({ errors }) => {
    return (
        <div className="validation-errors">
            {errors.map((error, index) => (
                <p key={index} className="error">{error}</p>
            ))}
        </div>
    );
};

export default ValidationErrors;