```javascript
import React from 'react';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => (
    <div className="dashboard-layout">
        <h1>Dashboard</h1>
        <Outlet />
    </div>
);

export default DashboardLayout;
```