import React, { createContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({ user: null, loading: true });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await getCurrentUser();
                setAuthState({ user, loading: false });
            } catch {
                setAuthState({ user: null, loading: false });
            }
        };
        fetchUser();
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        setAuthState((prevState) => ({ ...prevState, user: token })); // Simplified for demonstration
    };

    const logout = () => {
        localStorage.removeItem('token');
        setAuthState({ user: null, loading: false });
    };

    return (
        <AuthContext.Provider value={{ ...authState, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};