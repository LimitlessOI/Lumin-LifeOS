```javascript
import React from 'react';
import ProjectList from './ProjectList';

const Dashboard = () => {
    return (
        <div className="dashboard">
            <h1>Project Dashboard</h1>
            <ProjectList />
        </div>
    );
};

export default Dashboard;