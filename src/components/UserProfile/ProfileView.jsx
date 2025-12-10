```jsx
import React from 'react';

const ProfileView = ({ userProfile, onEdit }) => (
  <div>
    <h1>{userProfile.username}</h1>
    <p>{userProfile.email}</p>
    <button onClick={onEdit}>Edit Profile</button>
  </div>
);

export default ProfileView;
```