```javascript
import React, { useEffect, useState } from 'react';
import { getKPIs } from '../../services/analyticsService';

const KPICards = () => {
  const [kpis, setKpis] = useState([]);

  useEffect(() => {
    const fetchKPIs = async () => {
      const data = await getKPIs();
      setKpis(data);
    };
    fetchKPIs();
  }, []);

  return (
    <div>
      <h2>Key Performance Indicators</h2>
      <div>
        {kpis.map(kpi => (
          <div key={kpi.id}>
            <h3>{kpi.metric}</h3>
            <p>{kpi.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KPICards;