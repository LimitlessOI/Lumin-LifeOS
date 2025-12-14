```jsx
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState(() => {
        const token = localStorage.getItem('token');
        return { token };
    });

    useEffect(() => {
        localStorage.setItem('token', authState.token);
    }, [authState.token]);

    const setToken = (token) => {
        setAuthState({ token });
    };

    return (
        <AuthContext.Provider value={{ authState, setToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
```