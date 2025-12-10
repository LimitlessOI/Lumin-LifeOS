```jsx
import React from 'react';

const FormInput = ({ name, label, value, onChange }) => (
  <div className="form-input">
    <label htmlFor={name}>{label}</label>
    <input type="text" id={name} name={name} value={value} onChange={onChange} required />
  </div>
);

export default FormInput;
```