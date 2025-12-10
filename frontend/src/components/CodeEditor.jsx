```jsx
import React, { useState } from 'react';
import { useCodeGeneration } from '../hooks/useCodeGeneration';

const CodeEditor = () => {
  const [code, setCode] = useState('');
  const { generateCode } = useCodeGeneration();

  const handleGenerateCode = async () => {
    const result = await generateCode(code);
    // Display result to user
    console.log(result);
  };

  return (
    <div>
      <textarea value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={handleGenerateCode}>Generate Code</button>
    </div>
  );
};

export default CodeEditor;
```