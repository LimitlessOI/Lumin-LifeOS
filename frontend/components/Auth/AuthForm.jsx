```jsx
import React, { useState } from 'react';
import EmailInput from './EmailInput';
import PasswordInput from './PasswordInput';
import { useAuth } from '../../contexts/AuthContext';

const AuthForm = ({ type }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { signup, login } = useAuth();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (type === 'signup') {
            signup(email, password);
        } else {
            login(email, password);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <EmailInput value={email} onChange={setEmail} />
            <PasswordInput value={password} onChange={setPassword} />
            <button type="submit">{type === 'signup' ? 'Sign Up' : 'Log In'}</button>
        </form>
    );
};

export default AuthForm;
```