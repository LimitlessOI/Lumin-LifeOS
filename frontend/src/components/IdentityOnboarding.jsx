```jsx
import React, { useState } from 'react';
import useIdentity from '../hooks/useIdentity';

function IdentityOnboarding() {
  const { registerUser, verifyUser } = useIdentity();
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');

  const handleRegister = async () => {
    try {
      await registerUser(userName, email);
      alert('Registration successful!');
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed');
    }
  };

  const handleVerify = async () => {
    try {
      await verifyUser(email);
      alert('Verification successful!');
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Verification failed');
    }
  };

  return (
    <div>
      <h1>Identity Onboarding</h1>
      <input
        type="text"
        placeholder="User Name"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleRegister}>Register</button>
      <button onClick={handleVerify}>Verify</button>
    </div>
  );
}

export default IdentityOnboarding;