```javascript
import React from 'react';

const WorkflowFilters = ({ onSearch, onFilterChange }) => {
    return (
        <div className="workflow-filters">
            <input
                type="text"
                placeholder="Search..."
                onChange={(e) => onSearch(e.target.value)}
            />
            <select onChange={(e) => onFilterChange(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
            </select>
        </div>
    );
};

export default WorkflowFilters;