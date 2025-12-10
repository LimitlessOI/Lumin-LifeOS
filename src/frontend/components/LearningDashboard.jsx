import React from 'react';
import axios from 'axios';

const LearningDashboard = () => {
    const handleGeneratePath = async (userId) => {
        await axios.post(`/api/learning-path/${userId}`);
        alert('Learning path generated');
    };

    return (
        <div>
            <h1>Learning Dashboard</h1>
            <button onClick={() => handleGeneratePath(1)}>Generate Learning Path</button>
        </div>
    );
};

export default LearningDashboard;
//