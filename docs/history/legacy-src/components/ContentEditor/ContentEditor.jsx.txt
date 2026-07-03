```javascript
import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';

const ContentEditor = () => {
  const { authToken } = useContext(AuthContext);

  const handleSave = () => {
    // Functionality to save content
    console.log('Content saved');
  };

  return (
    <div>
      <h1>Content Editor</h1>
      <textarea rows="10" cols="50" placeholder="Edit your content here..."></textarea>
      <button onClick={handleSave}>Save</button>
    </div>
  );
};

export default ContentEditor;