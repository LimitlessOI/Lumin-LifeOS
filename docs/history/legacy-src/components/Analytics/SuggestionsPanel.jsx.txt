```javascript
import React, { useState, useEffect } from 'react';
import { getSuggestions, applySuggestion } from '../../services/analyticsService';

const SuggestionsPanel = () => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const data = await getSuggestions();
      setSuggestions(data);
    };
    fetchSuggestions();
  }, []);

  const handleApply = async (id) => {
    await applySuggestion(id);
    const updatedSuggestions = suggestions.map(suggestion =>
      suggestion.id === id ? { ...suggestion, status: 'applied' } : suggestion
    );
    setSuggestions(updatedSuggestions);
  };

  return (
    <div>
      <h2>AI Suggestions</h2>
      <ul>
        {suggestions.map(suggestion => (
          <li key={suggestion.id}>
            {suggestion.suggestion} - {suggestion.status}
            {suggestion.status === 'pending' && (
              <button onClick={() => handleApply(suggestion.id)}>Apply</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SuggestionsPanel;