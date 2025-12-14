```javascript
import React from 'react';

const ReportDetailModal = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>{report.report_name}</h2>
        <div>
          {report.ReportMetrics.map(metric => (
            <div key={metric.id}>
              <strong>{metric.metric_name}:</strong> {metric.metric_value}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportDetailModal;
```