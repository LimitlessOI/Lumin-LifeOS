```jsx
import React, { useState, useEffect } from 'react';
import Chart from 'chart.js';

function TherapistOverview() {
    const [sessions, setSessions] = useState([]);
    
    useEffect(() => {
        fetch('/api/sessions')
            .then(response => response.json())
            .then(data => setSessions(data));
    }, []);

    return (
        <div>
            <h1>Therapist Dashboard</h1>
            <ul>
                {sessions.map(session => (
                    <li key={session.session_id}>
                        Session {session.session_id}: {session.status}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default TherapistOverview;
```