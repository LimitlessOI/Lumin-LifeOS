```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import authApi from '../api/authApi';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Attempt to load user from local storage or validate token
    const loadUser = async () => {
      try {
        const userData = await authApi.getProfile();
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user', error);
      }
    };
    loadUser();
  }, []);

  const login = async (username, password) => {
    const { token } = await authApi.login(username, password);
    localStorage.setItem('token', token);
    const userData = await authApi.getProfile(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```