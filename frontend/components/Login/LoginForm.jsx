```jsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as Yup from 'yup';
import { useFormik } from 'formik';

const LoginForm = () => {
    const [error, setError] = useState(null);
    const { login } = useAuth();

    const formik = useFormik({
        initialValues: { email: '', password: '' },
        validationSchema: Yup.object({
            email: Yup.string().email('Invalid email address').required('Required'),
            password: Yup.string().min(6, 'Must be 6 characters or more').required('Required')
        }),
        onSubmit: async (values) => {
            try {
                await login(values.email, values.password);
            } catch (err) {
                setError('Login failed. Please check your credentials.');
            }
        }
    });

    return (
        <form onSubmit={formik.handleSubmit}>
            <div>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    {...formik.getFieldProps('email')}
                />
                {formik.touched.email && formik.errors.email ? (
                    <div>{formik.errors.email}</div>
                ) : null}
            </div>
            <div>
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    {...formik.getFieldProps('password')}
                />
                {formik.touched.password && formik.errors.password ? (
                    <div>{formik.errors.password}</div>
                ) : null}
            </div>
            {error && <div>{error}</div>}
            <button type="submit">Login</button>
        </form>
    );
};

export default LoginForm;
```