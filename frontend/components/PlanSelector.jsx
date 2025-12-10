```javascript
import React from 'react';

function PlanSelector({ plans }) {
  return (
    <div>
      <h2>Select a Plan</h2>
      <ul>
        {plans.map(plan => (
          <li key={plan.id}>{plan.name} - ${plan.price}</li>
        ))}
      </ul>
    </div>
  );
}

export default PlanSelector;
```