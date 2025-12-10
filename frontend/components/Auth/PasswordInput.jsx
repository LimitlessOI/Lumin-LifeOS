```jsx
import React from 'react';

const PasswordInput = ({ value, onChange }) => (
    <div>
        <label>Password:</label>
        <input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
        />
    </div>
);

export default PasswordInput;
```