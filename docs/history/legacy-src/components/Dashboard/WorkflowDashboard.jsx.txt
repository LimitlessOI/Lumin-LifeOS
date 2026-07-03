```javascript
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import WorkflowList from './WorkflowList';
import WorkflowMetrics from './WorkflowMetrics';
import WorkflowCreator from './WorkflowCreator';
import WorkflowEditor from './WorkflowEditor';

const WorkflowDashboard = () => {
    return (
        <Router>
            <div className="dashboard-container">
                <Switch>
                    <Route path="/" exact component={WorkflowList} />
                    <Route path="/metrics/:id" component={WorkflowMetrics} />
                    <Route path="/create" component={WorkflowCreator} />
                    <Route path="/edit/:id" component={WorkflowEditor} />
                </Switch>
            </div>
        </Router>
    );
};

export default WorkflowDashboard;