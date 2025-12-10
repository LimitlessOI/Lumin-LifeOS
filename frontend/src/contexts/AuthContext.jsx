```javascript
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get('/api/auth/userinfo');
        setUser(response.data);
      } catch (error) {
        setUser(null);
      }
    };
    fetchUserInfo();
  }, []);

  const login = async (email, password) => {
    try {
      await axios.post('/api/auth/login', { email, password });
      await fetchUserInfo();
    } catch (error) {
      throw new Error('Login failed');
    }
  };

  const logout = async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```