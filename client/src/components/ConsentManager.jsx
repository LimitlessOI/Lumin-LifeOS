```jsx
import React, { useState } from 'react';

const ConsentManager = () => {
    const [consentGiven, setConsentGiven] = useState(false);

    const handleConsent = () => {
        setConsentGiven(true);
        // Additional logic to handle consent storage or processing
    };

    return (
        <div>
            <p>{consentGiven ? 'Consent Given' : 'Please give consent to proceed'}</p>
            <button onClick={handleConsent} disabled={consentGiven}>Give Consent</button>
        </div>
    );
};

export default ConsentManager;