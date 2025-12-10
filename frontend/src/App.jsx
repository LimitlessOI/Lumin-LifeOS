import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Dashboard from './components/Dashboard'; // Assume a Dashboard component exists

const PrivateRoute = ({ component: Component, ...rest }) => {
    const { auth } = useAuthContext();
    return (
        <Route
            {...rest}
            render={(props) =>
                auth.user ? <Component {...props} /> : <Redirect to="/login" />
            }
        />
    );
};

const App = () => (
    <AuthProvider>
        <Router>
            <Switch>
                <Route path="/login" component={Login} />
                <PrivateRoute path="/dashboard" component={Dashboard} />
                <Redirect from="/" to="/dashboard" />
            </Switch>
        </Router>
    </AuthProvider>
);

export default App;