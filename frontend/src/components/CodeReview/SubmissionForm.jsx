```jsx
import React, { useState } from 'react';
import axios from 'axios';

function SubmissionForm() {
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('JavaScript');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/review/submit', { code, language });
            console.log(response.data.result);
        } catch (error) {
            console.error('Error submitting code:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} />
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="JavaScript">JavaScript</option>
                <option value="Java">Java</option>
                <option value="Python">Python</option>
            </select>
            <button type="submit">Submit</button>
        </form>
    );
}

export default SubmissionForm;
```