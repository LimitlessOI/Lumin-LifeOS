```javascript
import React, { createContext, useReducer, useContext } from 'react';

const ProcessContext = createContext();

const processReducer = (state, action) => {
    switch (action.type) {
        case 'SET_PROCESSES':
            return { ...state, processes: action.payload };
        default:
            return state;
    }
};

export const ProcessProvider = ({ children }) => {
    const [state, dispatch] = useReducer(processReducer, { processes: [] });

    return (
        <ProcessContext.Provider value={{ state, dispatch }}>
            {children}
        </ProcessContext.Provider>
    );
};

export const useProcessContext = () => {
    return useContext(ProcessContext);
};
```