import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AlertManager = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    api.getAlerts().then(data => setAlerts(data));
  }, []);

  return (
    <div>
      <h2>Performance Alerts</h2>
      <ul>
        {alerts.map((alert, index) => (
          <li key={index}>{alert.message}</li>
        ))}
      </ul>
    </div>
  );
};

export default AlertManager;