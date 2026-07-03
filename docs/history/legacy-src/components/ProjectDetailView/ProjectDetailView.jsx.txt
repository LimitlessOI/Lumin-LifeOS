```jsx
import React from 'react';
import './ProjectDetailView.css';
import FeedbackSection from './FeedbackSection';
import ProjectStatusBadge from './ProjectStatusBadge';
import { useProjectDetails } from '../../hooks/useProjectDetails';

const ProjectDetailView = ({ projectId }) => {
    const { data: project, isLoading, error } = useProjectDetails(projectId);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error loading project details</div>;

    return (
        <div className="project-detail-view">
            <h1>{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
            <p>{project.description}</p>
            <FeedbackSection projectId={projectId} />
        </div>
    );
};

export default ProjectDetailView;
```