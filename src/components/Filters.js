import React from 'react';

const Filters = ({ filter, onFilterChange }) => {
  return (
    <div className="mb-4">
      <select value={filter} onChange={(e) => onFilterChange(e.target.value)} className="border border-gray-300 rounded-md p-2">
        <option value="">All</option>
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="joined">Joined</option>
        <option value="follow-up">Follow-up</option>
      </select>
    </div>
  );
};

export default Filters;