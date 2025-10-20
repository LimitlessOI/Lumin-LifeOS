import React from 'react';

const Filters = ({ statusFilter, setStatusFilter }) => {
  return (
    <div className="mb-4">
      <label className="mr-2">Filter by Status:</label>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded p-2">
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