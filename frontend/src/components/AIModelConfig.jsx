import React, { useState } from 'react';
import api from '../services/api';

const AIModelConfig = () => {
  const [config, setConfig] = useState({});

  const handleSave = () => {
    api.saveAIModelConfig(config).then(response => {
      alert('Configuration Saved!');
    });
  };

  return (
    <div>
      <h2>AI Model Configuration</h2>
      <textarea value={JSON.stringify(config)} onChange={e => setConfig(JSON.parse(e.target.value))} />
      <button onClick={handleSave}>Save Configuration</button>
    </div>
  );
};

export default AIModelConfig;