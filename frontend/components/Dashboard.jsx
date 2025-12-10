```javascript
import React, { useState, useEffect } from 'react';
import { fetchProjects } from '../services/projectService';
import ProjectList from './ProjectList';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import './Dashboard.css';

function Dashboard() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadProjects() {
            try {
                const data = await fetchProjects();
                setProjects(data);
            } catch (error) {
                setError(error);
            } finally {
                setLoading(false);
            }
        }

        loadProjects();
    }, []);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorDisplay error={error.message} />;

    return (
        <div className="dashboard">
            <h1>Project Dashboard</h1>
            <ProjectList projects={projects} />
        </div>
    );
}

export default Dashboard;
```