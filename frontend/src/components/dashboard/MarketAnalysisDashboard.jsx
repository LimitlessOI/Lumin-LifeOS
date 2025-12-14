```javascript
import React from 'react';
import useMarketReports from '../../hooks/useMarketReports';
import ReportCard from './ReportCard';

const MarketAnalysisDashboard = () => {
  const { reports, loading, error } = useMarketReports();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading reports: {error.message}</div>;

  return (
    <div>
      <h1>Market Analysis Dashboard</h1>
      <div>
        {reports.map(report => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
};

export default MarketAnalysisDashboard;
```