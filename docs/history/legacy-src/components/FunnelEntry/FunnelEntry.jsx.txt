```jsx
import React, { useContext } from 'react';
import FunnelContext from './FunnelContext';
import StepRenderer from './StepRenderer';
import AnalyticsTracker from './AnalyticsTracker';

const FunnelEntry = () => {
    const { funnelState, updateFunnelState } = useContext(FunnelContext);

    return (
        <div className="funnel-entry">
            <h1>Welcome to the Funnel</h1>
            <form onSubmit={(e) => e.preventDefault()}>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={funnelState.name}
                    onChange={(e) => updateFunnelState({ name: e.target.value })}
                />
                <button type="submit">Submit</button>
            </form>
            <StepRenderer />
            <AnalyticsTracker />
        </div>
    );
};

export default FunnelEntry;