import React, { useState } from 'react';
import axios from 'axios';

const MetacognitiveLogger = () => {
    const [logEntry, setLogEntry] = useState('');

    const handleLogSubmit = async (userId) => {
        await axios.post(`/api/metacognitive-log/${userId}`, { logEntry });
        alert('Log submitted');
    };

    return (
        <div>
            <h1>Metacognitive Logger</h1>
            <textarea value={logEntry} onChange={(e) => setLogEntry(e.target.value)} />
            <button onClick={() => handleLogSubmit(1)}>Submit Log</button>
        </div>
    );
};

export default MetacognitiveLogger;
//