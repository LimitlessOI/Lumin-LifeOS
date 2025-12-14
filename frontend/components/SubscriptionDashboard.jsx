```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PlanSelector from './PlanSelector';
import BillingHistory from './BillingHistory';

function SubscriptionDashboard() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    async function fetchPlans() {
      const response = await axios.get('/api/plans');
      setPlans(response.data);
    }
    fetchPlans();
  }, []);

  return (
    <div>
      <h1>Subscription Dashboard</h1>
      <PlanSelector plans={plans} />
      <BillingHistory />
    </div>
  );
}

export default SubscriptionDashboard;
```