```jsx
import React from 'react';

const EmailInput = ({ value, onChange }) => (
    <div>
        <label>Email:</label>
        <input
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
        />
    </div>
);

export default EmailInput;
```