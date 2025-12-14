```javascript
import React, { useState } from 'react';
import { createScenario } from '../../services/makeApi';
import { useMakeScenarios } from '../../hooks/useMakeScenarios';

export const ScenarioForm = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { setScenarios } = useMakeScenarios();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newScenario = await createScenario({ name, description });
    setScenarios(prev => [...prev, newScenario]);
    setName('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Scenario Name"
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description"
      />
      <button type="submit">Add Scenario</button>
    </form>
  );
};