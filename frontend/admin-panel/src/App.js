```javascript
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import SystemStatus from './components/SystemStatus';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ChatbotManager from './components/ChatbotManager';
import RBACManager from './components/RBACManager';

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" exact component={Dashboard} />
        <Route path="/system-status" component={SystemStatus} />
        <Route path="/analytics" component={AnalyticsDashboard} />
        <Route path="/chatbot-manager" component={ChatbotManager} />
        <Route path="/rbac-manager" component={RBACManager} />
      </Switch>
    </Router>
  );
}

export default App;
```