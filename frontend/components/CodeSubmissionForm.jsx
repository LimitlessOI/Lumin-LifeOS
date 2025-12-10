import React, { useState } from 'react';

const CodeSubmissionForm = ({ onSubmit }) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ code, language });
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter your code here"
        required
      />
      <select value={language} onChange={(e) => setLanguage(e.target.value)} required>
        <option value="">Select Language</option>
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
      </select>
      <button type="submit">Submit Code</button>
    </form>
  );
};

export default CodeSubmissionForm;