import React from 'react';

const DailyStats = ({ stats }) => {
  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <h2 className="text-lg font-semibold">Daily Stats</h2>
      <ul>
        <li>Total Leads: {stats.totalLeads}</li>
        <li>Calls Made: {stats.callsMade}</li>
        <li>Join Rate: {stats.joinRate.toFixed(2)}%</li>
      </ul>
    </div>
  );
};

export default DailyStats;