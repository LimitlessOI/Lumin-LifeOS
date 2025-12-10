```javascript
import React from 'react';
import useProjectData from '../../hooks/useProjectData';
import ProjectCard from './ProjectCard';
import './Dashboard.css';

const ProjectDashboard = () => {
  const { projects, loading } = useProjectData();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};

export default ProjectDashboard;