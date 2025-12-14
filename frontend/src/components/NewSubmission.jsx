```javascript
import React, { useState } from 'react';
import { createSubmission } from '../services/dashboardApi';

const NewSubmission = ({ userId }) => {
    const [code, setCode] = useState('');

    const handleSubmit = async () => {
        try {
            await createSubmission(userId, code);
            alert('Submission successful');
        } catch (error) {
            console.error('Error submitting code:', error);
        }
    };

    return (
        <div>
            <h2>New Submission</h2>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} />
            <button onClick={handleSubmit}>Submit</button>
        </div>
    );
};

export default NewSubmission;
```