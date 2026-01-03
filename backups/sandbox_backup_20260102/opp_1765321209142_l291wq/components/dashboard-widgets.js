import React from 'react';
// ... other imports and setup code if necessary

const DashboardWidget = ({ activeTickets, pendingResolutions }) => (
    <div>
        {/* Render your widget components here */}
        <h2>Active Tickets</h2>
        <ul>
            {activeTickets.map(ticket => 
                <li key={ticket.id}>{ticket.subject}</li>
            )}
        </ul>
        
        <h2>Pending Resolutions</h2>
        <ul>
            {pendingResolutions.map(resolution => 
                <li key={resolution.id}>{resolution.status}</li>
            )}
        </ul>
    </div>
);

export default DashboardWidget;