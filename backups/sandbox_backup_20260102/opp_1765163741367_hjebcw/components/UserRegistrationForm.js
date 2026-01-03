import React, { useState } from 'react';
import './UserRegistrationForm.css'; // Assuming CSS file exists for styling the form

function UserRegistrationForm() {
    const [userData, setUserData] = useState({ /* Initial state with empty fields or defaults */ });

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Send a POST request to '/users' API endpoint using fetch or Axios here...
    };

    return (
        <form onSubmit={handleSubmit}>
            <label>Email:</label>
            <input type="email" value={userData.email} onChange={(e) => setUserData({ ...userData, email: e.target.value })} required />
            {/* Other input fields for user data */}
            <button type="submit">Register</button>
        </form>
    );
}