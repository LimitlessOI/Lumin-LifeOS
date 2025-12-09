```jsx
import React, { useState, useEffect } from 'react';

function IdentityDashboard() {
    const [identities, setIdentities] = useState([]);

    useEffect(() => {
        // Fetch identities from the backend
        async function fetchIdentities() {
            const response = await fetch('/api/identities');
            const data = await response.json();
            setIdentities(data);
        }
        fetchIdentities();
    }, []);

    return (
        <div>
            <h1>Identity Dashboard</h1>
            <ul>
                {identities.map(identity => (
                    <li key={identity.user_id}>
                        {identity.name} - {identity.verified ? 'Verified' : 'Pending'}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default IdentityDashboard;
```