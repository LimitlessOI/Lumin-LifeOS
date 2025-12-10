```jsx
import React from 'react';

const OAuthButton = ({ provider }) => {
  const handleOAuthLogin = () => {
    window.location.href = `/api/v1/auth/oauth/${provider}`;
  };

  return (
    <button onClick={handleOAuthLogin} className={`oauth-button ${provider}`}>
      Login with {provider.charAt(0).toUpperCase() + provider.slice(1)}
    </button>
  );
};

export default OAuthButton;
```