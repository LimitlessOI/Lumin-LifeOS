```javascript
import React from 'react';
import WorkshopCard from './WorkshopCard';
import { useWorkshops } from '../../hooks/useWorkshops';

const WorkshopList = () => {
  const { data: workshops, isLoading, error } = useWorkshops();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading workshops</div>;

  return (
    <div>
      {workshops.map(workshop => (
        <WorkshopCard key={workshop.id} workshop={workshop} />
      ))}
    </div>
  );
};

export default WorkshopList;