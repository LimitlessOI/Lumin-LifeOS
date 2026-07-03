```javascript
import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Assumed existing hook for authentication
import Dashboard from '../components/Dashboard/Dashboard';

const DashboardRoute = ({ ...rest }) => {
    const { isAuthenticated } = useAuth();

    return (
        <Route
            {...rest}
            render={({ location }) =>
                isAuthenticated ? (
                    <Dashboard />
                ) : (
                    <Redirect
                        to={{
                            pathname: "/login",
                            state: { from: location }
                        }}
                    />
                )
            }
        />
    );
};

export default DashboardRoute;