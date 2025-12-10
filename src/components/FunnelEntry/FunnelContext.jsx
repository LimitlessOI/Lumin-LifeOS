```jsx
import React, { createContext, useState } from 'react';

const FunnelContext = createContext();

export const FunnelProvider = ({ children }) => {
    const [funnelState, setFunnelState] = useState({ name: '', step: 1 });

    const updateFunnelState = (newState) => {
        setFunnelState(prevState => ({ ...prevState, ...newState }));
    };

    return (
        <FunnelContext.Provider value={{ funnelState, updateFunnelState }}>
            {children}
        </FunnelContext.Provider>
    );
};

export default FunnelContext;