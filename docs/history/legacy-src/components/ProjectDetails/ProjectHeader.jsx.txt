```javascript
import React from 'react';

const ProjectHeader = ({ project }) => (
  <div className="project-header">
    <h1>{project.name}</h1>
    <p>{project.description}</p>
  </div>
);

export default ProjectHeader;