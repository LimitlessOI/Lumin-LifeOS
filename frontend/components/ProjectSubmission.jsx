```jsx
import React, { useState } from 'react';

function ProjectSubmission() {
  const [project, setProject] = useState('');

  const handleSubmit = () => {
    // Submit project logic
  };

  return (
    <div>
      <h1>Project Submission</h1>
      <textarea value={project} onChange={(e) => setProject(e.target.value)} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default ProjectSubmission;