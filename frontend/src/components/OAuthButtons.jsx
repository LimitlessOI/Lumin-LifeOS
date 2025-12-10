```javascript
import React from 'react';

const OAuthButtons = () => {
  const handleGitHubLogin = () => {
    window.location.href = '/auth/github'; // Modify to actual endpoint
  };

  const handleGoogleLogin = () => {
    window.location.href = '/auth/google'; // Modify to actual endpoint
  };

  return (
    <div>
      <button onClick={handleGitHubLogin}>Login with GitHub</button>
      <button onClick={handleGoogleLogin}>Login with Google</button>
    </div>
  );
};

export default OAuthButtons;
```