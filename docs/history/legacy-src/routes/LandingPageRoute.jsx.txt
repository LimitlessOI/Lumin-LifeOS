```jsx
import React from 'react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import AIContentLanding from '../components/landing/AIContentLanding';

const LandingPageRoute = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>AI Content Landing Page</title>
        <meta name="description" content="Discover AI-driven content solutions." />
        <meta property="og:image" content="/landing-og-image.png" />
      </Helmet>
      <AIContentLanding />
    </HelmetProvider>
  );
};

export default LandingPageRoute;
```