```jsx
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import WorkflowBuilder from './components/WorkflowBuilder/WorkflowBuilder';
import TaskLibrary from './components/TaskLibrary/TaskLibrary';
import ExecutionHistory from './components/ExecutionHistory/ExecutionHistory';
import NotificationCenter from './components/Notifications/NotificationCenter';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <NotificationCenter />
        <Switch>
          <Route path="/workflow-builder" component={WorkflowBuilder} />
          <Route path="/task-library" component={TaskLibrary} />
          <Route path="/execution-history" component={ExecutionHistory} />
          <Route path="/" exact component={() => <div>Welcome to Automation Feature</div>} />
        </Switch>
      </div>
    </Router>
  );
}

export default App;
```