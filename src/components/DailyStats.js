import React from 'react';

const DailyStats = ({ stats }) => {
  return (
    <div className="mb-4 p-4 border rounded">
      <h2 className="text-lg font-bold">Daily Stats</h2>
      <p>Total Leads: {stats.totalLeads}</p>
      <p>Calls Made: {stats.callsMade}</p>
      <p>Join Rate: {stats.joinRate}%</p>
    </div>
  );
};

export default DailyStats;