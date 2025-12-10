import React, { useState } from 'react';
import { loginUser } from '../../api/auth';
import './LoginForm.css';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = await loginUser({ email, password });
            // Assuming we have a login function from context
            login(token);
        } catch (err) {
            setError('Login failed');
        }
    };

    return (
        <form className="login-form" onSubmit={handleSubmit}>
            <div>
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit">Login</button>
        </form>
    );
};

export default LoginForm;