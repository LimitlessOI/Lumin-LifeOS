import React from 'react';

const DailyStats = ({ stats }) => {
  return (
    <div className="mb-4 p-4 border rounded bg-gray-100">
      <h2 className="text-xl font-semibold">Daily Stats</h2>
      <p>Total Leads: {stats.totalLeads}</p>
      <p>Calls Made: {stats.callsMade}</p>
      <p>Join Rate: {stats.joinRate.toFixed(2)}%</p>
    </div>
  );
};

export default DailyStats;