```javascript
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientOnboardingSchema } from '../../validation/onboardingSchema';
import FormFieldRenderer from './FormFieldRenderer';
import { submitOnboardingData } from '../../services/onboardingApi';

const ClientOnboardingForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(clientOnboardingSchema),
  });

  const onSubmit = async (data) => {
    try {
      await submitOnboardingData(data);
      alert('Onboarding successful');
    } catch (error) {
      alert('Error during onboarding');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormFieldRenderer register={register} errors={errors} />
      <button type="submit">Submit</button>
    </form>
  );
};

export default ClientOnboardingForm;
```