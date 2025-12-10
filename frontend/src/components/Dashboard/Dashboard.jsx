import React from 'react';
import ProjectCard from './ProjectCard';
import useProjects from '../../hooks/useProjects';
import './Dashboard.css';

function Dashboard() {
  const { data: projects, error, isLoading } = useProjects();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading projects</div>;

  return (
    <div className="dashboard">
      <h1>Project Dashboard</h1>
      <div className="project-list">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

export default Dashboard;