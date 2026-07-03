```javascript
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ProjectDetails from './components/ProjectDetails/ProjectDetails';

const App = () => (
  <Router>
    <Routes>
      <Route path="/projects/:projectId" element={<ProjectDetails />} />
      {/* other routes */}
    </Routes>
  </Router>
);

export default App;