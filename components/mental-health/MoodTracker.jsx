```jsx
import React, { useState } from 'react';

const MoodTracker = () => {
  const [mood, setMood] = useState('');

  const handleMoodSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/v1/mental-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood })
      });
      const data = await response.json();
      console.log('Mood logged:', data);
    } catch (error) {
      console.error('Error in mood submission:', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleMoodSubmit}>
        <input
          type="text"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="How are you feeling?"
        />
        <button type="submit">Log Mood</button>
      </form>
    </div>
  );
};

export default MoodTracker;
```