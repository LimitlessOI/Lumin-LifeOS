```javascript
import React from 'react';

const ProjectCard = ({ project }) => {
    return (
        <div className="project-card">
            <h2>{project.name}</h2>
            <p>{project.description}</p>
        </div>
    );
};

export default ProjectCard;