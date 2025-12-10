import React from 'react';

function ProjectCard({ project }) {
  return (
    <div className="project-card">
      <h2>{project.name}</h2>
      <p>Status: {project.status}</p>
    </div>
  );
}

export default ProjectCard;