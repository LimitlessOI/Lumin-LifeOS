import React, { useState } from 'react';
import axios from 'axios';

const SubmissionForm = () => {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/v1/code-review/submit', { code });
            setStatus(`Submission successful: ID ${response.data.submissionId}`);
        } catch (error) {
            setStatus('Submission failed. Please try again.');
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <textarea value={code} onChange={(e) => setCode(e.target.value)} />
                <button type="submit">Submit Code</button>
            </form>
            {status && <p>{status}</p>}
        </div>
    );
};

export default SubmissionForm;