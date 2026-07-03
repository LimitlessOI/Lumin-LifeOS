```jsx
import React, { createContext, useContext, useReducer } from 'react';

const UserProfileContext = createContext();

const userProfileReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    default:
      return state;
  }
};

export const UserProfileProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userProfileReducer, { userProfile: null });

  return (
    <UserProfileContext.Provider value={{ state, dispatch }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfileContext = () => useContext(UserProfileContext);
```