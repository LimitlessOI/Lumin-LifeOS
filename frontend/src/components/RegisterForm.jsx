```javascript
import React from 'react';
import AuthForm from './AuthForm';
import axios from 'axios';
import * as yup from 'yup';

const RegisterForm = () => {
  const initialValues = {
    email: '',
    password: '',
  };

  const validationSchema = yup.object().shape({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  });

  const handleSubmit = async (values) => {
    try {
      await axios.post('/api/auth/register', values);
      alert('Registration successful');
    } catch (error) {
      alert('Registration failed');
    }
  };

  return (
    <AuthForm
      onSubmit={handleSubmit}
      initialValues={initialValues}
      validationSchema={validationSchema}
      buttonText="Register"
    />
  );
};

export default RegisterForm;
```