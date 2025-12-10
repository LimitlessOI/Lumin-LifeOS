```javascript
import React from 'react';
import PropTypes from 'prop-types';
import './ProjectList.css';

function ProjectList({ projects }) {
    return (
        <ul className="project-list">
            {projects.map(project => (
                <li key={project.id} className="project-item">
                    <h2>{project.name}</h2>
                    <p>{project.description}</p>
                </li>
            ))}
        </ul>
    );
}

ProjectList.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string
    })).isRequired
};

export default ProjectList;
```