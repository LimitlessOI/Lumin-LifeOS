```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NeurodiversityDashboard = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      const response = await axios.get('/api/v1/profile/export');
      setProfile(response.data);
    }
    fetchProfile();
  }, []);

  return (
    <div>
      {profile ? (
        <div>
          <h1>{profile.name}'s Learning Profile</h1>
          <p>Learning Style: {profile.learningStyle}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default NeurodiversityDashboard;