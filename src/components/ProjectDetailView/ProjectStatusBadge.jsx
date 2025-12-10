```jsx
import React from 'react';
import './ProjectStatusBadge.css';

const ProjectStatusBadge = ({ status }) => {
    return <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>;
};

export default ProjectStatusBadge;
```