```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RoleManager = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        axios.get('/api/admin/users')
            .then(response => setUsers(response.data))
            .catch(error => console.error('Error fetching users:', error));
    }, []);

    const updateUserRole = (userId, newRole) => {
        axios.post(`/api/admin/users/${userId}/role`, { role: newRole })
            .then(response => alert('User role updated successfully'))
            .catch(error => console.error('Error updating user role:', error));
    };

    return (
        <div>
            <h2>Role Manager</h2>
            <ul>
                {users.map(user => (
                    <li key={user.id}>
                        {user.name} - Current Role: {user.role}
                        <select onChange={(e) => updateUserRole(user.id, e.target.value)} defaultValue={user.role}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RoleManager;