```javascript
import React from 'react';
import KPICards from './KPICards';
import TrendsChart from './TrendsChart';
import SuggestionsPanel from './SuggestionsPanel';

const AnalyticsDashboard = () => {
  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <KPICards />
      <TrendsChart />
      <SuggestionsPanel />
    </div>
  );
};

export default AnalyticsDashboard;