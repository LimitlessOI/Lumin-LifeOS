```javascript
import React from 'react';
import { useParams } from 'react-router-dom';
import { useProjectDetails } from '../../hooks/useProjectDetails';
import ProjectHeader from './ProjectHeader';
import ReviewsList from './ReviewsList';
import Skeleton from 'react-loading-skeleton';
import { ErrorBoundary } from 'react-error-boundary';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const { project, reviews, loading, error } = useProjectDetails(projectId);

  if (loading) return <Skeleton count={5} />;
  if (error) return <div>Error loading project details</div>;

  return (
    <ErrorBoundary FallbackComponent={() => <div>Something went wrong.</div>}>
      <div className="project-details">
        {project && <ProjectHeader project={project} />}
        <ReviewsList reviews={reviews} />
      </div>
    </ErrorBoundary>
  );
};

export default ProjectDetails;