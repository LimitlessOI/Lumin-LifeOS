```tsx
import React from 'react';
import EventTimeline from '../../components/financial-copilot/EventTimeline';
import ProtocolWizard from '../../components/financial-copilot/ProtocolWizard';
import SimulationDashboard from '../../components/financial-copilot/SimulationDashboard';

const FinancialCopilotPage: React.FC = () => {
    return (
        <div>
            <h1>Financial Copilot</h1>
            <EventTimeline />
            <ProtocolWizard />
            <SimulationDashboard />
        </div>
    );
};

export default FinancialCopilotPage;
```