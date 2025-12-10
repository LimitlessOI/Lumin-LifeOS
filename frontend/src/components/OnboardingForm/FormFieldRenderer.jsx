```javascript
import React from 'react';

const FormFieldRenderer = ({ register, errors }) => (
  <>
    <div>
      <label>Name</label>
      <input type="text" {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
    </div>
    <div>
      <label>Email</label>
      <input type="email" {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
    </div>
    {/* Add more fields as needed */}
  </>
);

export default FormFieldRenderer;
```