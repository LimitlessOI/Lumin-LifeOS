```javascript
import React from 'react';
import AuthForm from './AuthForm';
import { useAuth } from '../hooks/useAuth';
import * as yup from 'yup';

const LoginForm = () => {
  const { login } = useAuth();

  const initialValues = {
    email: '',
    password: '',
  };

  const validationSchema = yup.object().shape({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
  });

  const handleSubmit = async (values) => {
    try {
      await login(values.email, values.password);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <AuthForm
      onSubmit={handleSubmit}
      initialValues={initialValues}
      validationSchema={validationSchema}
      buttonText="Login"
    />
  );
};

export default LoginForm;
```