```javascript
import React from 'react';

const WorkshopCard = ({ workshop }) => {
  return (
    <div>
      <h3>{workshop.title}</h3>
      <p>{workshop.description}</p>
      <p>{new Date(workshop.date).toLocaleDateString()}</p>
    </div>
  );
};

export default WorkshopCard;