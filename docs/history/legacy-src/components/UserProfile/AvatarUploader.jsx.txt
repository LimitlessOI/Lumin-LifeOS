```jsx
import React from 'react';

const AvatarUploader = ({ userProfile, onUpdate }) => {
  const handleUpload = (e) => {
    const file = e.target.files[0];
    // Handle file upload logic here
  };

  return (
    <div>
      <h2>Upload Avatar</h2>
      <input type="file" onChange={handleUpload} />
    </div>
  );
};

export default AvatarUploader;
```