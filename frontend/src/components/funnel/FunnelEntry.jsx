```jsx
import React from 'react';
import { useFunnelSession } from '../../hooks/useFunnelSession';

const FunnelEntry = () => {
    const { startSession, currentStep, updateStep } = useFunnelSession();

    const handleStart = async () => {
        await startSession();
    };

    const handleNextStep = async () => {
        await updateStep('NextStep', { data: 'example' });
    };

    return (
        <div>
            <button onClick={handleStart}>Start Funnel</button>
            <div>Current Step: {currentStep}</div>
            <button onClick={handleNextStep}>Next Step</button>
        </div>
    );
};

export default FunnelEntry;
```