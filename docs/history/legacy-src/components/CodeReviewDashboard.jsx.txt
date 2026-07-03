```javascript
import React from 'react';
import useCodeReview from '../hooks/useCodeReview';
import CodeReviewProjectCard from './CodeReviewProjectCard';

const CodeReviewDashboard = () => {
    const { projects, loading, error } = useCodeReview();

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading projects</div>;

    return (
        <div>
            {projects.map(project => (
                <CodeReviewProjectCard key={project.id} project={project} />
            ))}
        </div>
    );
};

export default CodeReviewDashboard;