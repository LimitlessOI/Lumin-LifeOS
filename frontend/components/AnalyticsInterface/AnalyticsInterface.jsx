import React from 'react';
import ConversionChart from './ConversionChart';
import EngagementMetrics from './EngagementMetrics';
import RealTimeUpdater from './RealTimeUpdater';

const AnalyticsInterface = () => {
  return (
    <div>
      <h1>Analytics Dashboard</h1>
      <ConversionChart />
      <EngagementMetrics />
      <RealTimeUpdater />
    </div>
  );
};

export default AnalyticsInterface;