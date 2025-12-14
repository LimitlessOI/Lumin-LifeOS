```javascript
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import profileValidation from '../validation/profileValidation';

const ProfileEdit = ({ profile, onCancel }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: profile,
    resolver: yupResolver(profileValidation),
  });

  const onSubmit = data => {
    // API call to update profile
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input type="text" {...register('name')} />
      <p>{errors.name?.message}</p>

      <input type="file" {...register('avatar')} />
      <p>{errors.avatar?.message}</p>

      <button type="submit">Save</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
};

export default ProfileEdit;
```