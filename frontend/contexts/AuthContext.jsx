```jsx
import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const signup = async (email, password) => {
        try {
            await axios.post('/api/v1/auth/signup', { email, password });
        } catch (error) {
            console.error(error);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await axios.post('/api/v1/auth/login', { email, password });
            setUser(response.data.user);
        } catch (error) {
            console.error(error);
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/v1/auth/logout');
            setUser(null);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, signup, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
```