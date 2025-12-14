```javascript
import React from 'react';
import ProfileView from './ProfileView';
import ProfileEdit from './ProfileEdit';
import { useUserProfile } from '../hooks/useUserProfile';

const UserProfile = () => {
  const { profile, isEditing, toggleEdit } = useUserProfile();

  return (
    <div>
      {isEditing ? (
        <ProfileEdit profile={profile} onCancel={toggleEdit} />
      ) : (
        <ProfileView profile={profile} onEdit={toggleEdit} />
      )}
    </div>
  );
};

export default UserProfile;
```