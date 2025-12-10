```jsx
import React, { useEffect, useState } from 'react';
import ProfileView from './ProfileView';
import ProfileEdit from './ProfileEdit';
import PreferencesPanel from './PreferencesPanel';
import AvatarUploader from './AvatarUploader';
import { useUserProfile } from '../../hooks/useUserProfile';

const ProfileContainer = () => {
  const { userProfile, fetchUserProfile, updateUserProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleEditToggle = () => setIsEditing(!isEditing);

  return (
    <div>
      {isEditing ? (
        <ProfileEdit userProfile={userProfile} onSave={updateUserProfile} onCancel={handleEditToggle} />
      ) : (
        <ProfileView userProfile={userProfile} onEdit={handleEditToggle} />
      )}
      <PreferencesPanel userProfile={userProfile} />
      <AvatarUploader userProfile={userProfile} onUpdate={updateUserProfile} />
    </div>
  );
};

export default ProfileContainer;
```