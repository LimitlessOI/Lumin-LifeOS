```javascript
import React from 'react';

const ReportCard = ({ report }) => {
  return (
    <div className="report-card">
      <h2>{report.report_name}</h2>
      <p>Created at: {new Date(report.created_at).toLocaleString()}</p>
    </div>
  );
};

export default ReportCard;
```