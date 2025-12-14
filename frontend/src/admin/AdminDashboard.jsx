```javascript
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import FunnelMetrics from './components/FunnelMetrics';
import AIModelManager from './components/AIModelManager';
import RoleManager from './components/RoleManager';
import DashboardCustomizer from './components/DashboardCustomizer';

const AdminDashboard = () => {
    return (
        <Router>
            <div className="admin-dashboard">
                <h1>Admin Dashboard</h1>
                <Switch>
                    <Route path="/admin/funnel-metrics" component={FunnelMetrics} />
                    <Route path="/admin/ai-model-manager" component={AIModelManager} />
                    <Route path="/admin/role-manager" component={RoleManager} />
                    <Route path="/admin/dashboard-customizer" component={DashboardCustomizer} />
                </Switch>
            </div>
        </Router>
    );
};

export default AdminDashboard;