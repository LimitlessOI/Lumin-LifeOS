```jsx
import React, { useState } from 'react';
import MonacoEditor from 'react-monaco-editor';
import axios from 'axios';

function CodeReviewInput() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/code-review/submit', { codeSnippet: code });
      console.log('Review submitted:', response.data);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <MonacoEditor
        height="400"
        language="javascript"
        theme="vs-dark"
        value={code}
        onChange={setCode}
      />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Submitting...' : 'Submit for Review'}
      </button>
    </div>
  );
}

export default CodeReviewInput;