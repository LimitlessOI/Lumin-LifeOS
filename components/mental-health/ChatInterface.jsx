```jsx
import React, { useState } from 'react';

const ChatInterface = () => {
  const [inputText, setInputText] = useState('');
  const [conversationSummary, setConversationSummary] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/v1/mental-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputText })
      });
      const data = await response.json();
      setConversationSummary(data.conversationSummary);
    } catch (error) {
      console.error('Error in chat submission:', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your thoughts here..."
        />
        <button type="submit">Submit</button>
      </form>
      <div>
        <h3>Conversation Summary:</h3>
        <p>{conversationSummary}</p>
      </div>
    </div>
  );
};

export default ChatInterface;
```