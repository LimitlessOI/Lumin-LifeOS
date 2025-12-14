```jsx
import React, { useState } from 'react';
import Axios from 'axios';
import FormInput from './FormInput';
import './onboarding.css';

const ClientOnboardingForm = () => {
  const [formData, setFormData] = useState({ client_name: '', email: '' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await Axios.post('/api/v1/onboarding/submit', formData);
      setMessage(response.data.message);
    } catch (error) {
      console.error(error);
      setMessage('Submission failed');
    }
  };

  return (
    <form className="onboarding-form" onSubmit={handleSubmit}>
      <FormInput name="client_name" label="Name" value={formData.client_name} onChange={handleChange} />
      <FormInput name="email" label="Email" value={formData.email} onChange={handleChange} />
      <button type="submit">Submit</button>
      <p>{message}</p>
    </form>
  );
};

export default ClientOnboardingForm;
```