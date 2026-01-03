import React from 'react';
import PropTypes from 'prop-types'; // for validation of props passed into components (if using functional or class components)
import { AppBar, Toolbar, Typography } from '@material-ui/core';

const UserDashboard = ({ userData }) => {
    return <AppBar title={<Typography>{userData.username}</Typography>}></AppBar>; // A simple dashboard component for username display; more functionality can be added as needed (login, logout buttons etc.)
};

UserDashboard.propTypes = {
  userData: PropTypes.shape().isRequired, // Validation that the prop 'userData' is a required object with at least an expected shape defined by your needs. Replace `{}` and `.isRequired` accordingly when adding more props or changing requirements later on.
};