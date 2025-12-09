```jsx
// admin-dashboard.jsx
import React, { useEffect, useState } from 'react';

const AdminDashboard = () => {
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        // Fetch session data from API
        fetch('/api/vr/sessions')
            .then(response => response.json())
            .then(data => setSessions(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <ul>
                {sessions.map(session => (
                    <li key={session.id}>
                        {session.userId} - {session.status}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AdminDashboard;