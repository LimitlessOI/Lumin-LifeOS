```javascript
import React, { createContext, useState, useEffect } from 'react';
import authService from '../../services/authService';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.fetchUserData(token).then(setUser).catch(() => setUser(null));
    }
  }, []);

  const login = async (email, password) => {
    const { token } = await authService.login(email, password);
    localStorage.setItem('token', token);
    const userData = await authService.fetchUserData(token);
    setUser(userData);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;