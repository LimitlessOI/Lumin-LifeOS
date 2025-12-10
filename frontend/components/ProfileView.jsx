```javascript
import React from 'react';

const ProfileView = ({ profile, onEdit }) => (
  <div>
    <img src={profile.avatar_url} alt="Avatar" />
    <h2>{profile.name}</h2>
    <button onClick={onEdit}>Edit Profile</button>
  </div>
);

export default ProfileView;
```