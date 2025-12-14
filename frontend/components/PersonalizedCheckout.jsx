```jsx
import React, { useState, useEffect } from 'react';
import useCheckoutPersonalization from '../hooks/useCheckoutPersonalization';

const PersonalizedCheckout = ({ userId }) => {
  const [personalizedOffer, setPersonalizedOffer] = useState(null);
  const { getPersonalizedOffer } = useCheckoutPersonalization();

  useEffect(() => {
    async function fetchOffer() {
      const offer = await getPersonalizedOffer(userId);
      setPersonalizedOffer(offer);
    }
    fetchOffer();
  }, [userId, getPersonalizedOffer]);

  return (
    <div>
      {personalizedOffer ? (
        <div>
          <h2>{personalizedOffer.personalizedOffer}</h2>
          <p>{personalizedOffer.details}</p>
        </div>
      ) : (
        <p>Loading your personalized offer...</p>
      )}
    </div>
  );
};

export default PersonalizedCheckout;
```