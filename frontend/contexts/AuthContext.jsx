```jsx
import React, { createContext, useState } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState(null);

    const login = async (email, password) => {
        const token = await authService.login(email, password);
        setAuth(token);
    };

    const logout = async () => {
        await authService.logout();
        setAuth(null);
    };

    return (
        <AuthContext.Provider value={{ auth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
```