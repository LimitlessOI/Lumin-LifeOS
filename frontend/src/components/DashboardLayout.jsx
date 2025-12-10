import React from 'react';
import FunnelAnalytics from './FunnelAnalytics';
import AIModelConfig from './AIModelConfig';
import AlertManager from './AlertManager';

const DashboardLayout = () => {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <FunnelAnalytics />
      <AIModelConfig />
      <AlertManager />
    </div>
  );
};

export default DashboardLayout;