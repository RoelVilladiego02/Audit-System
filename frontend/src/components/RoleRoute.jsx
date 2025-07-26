import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const RoleRoute = ({ children, requiredRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // Show a loading spinner while checking auth state
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        // Not logged in, redirect to login page with return url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!requiredRoles.includes(user.role)) {
        // User's role is not authorized, redirect to home page
        return <Navigate to="/" state={{ error: 'forbidden' }} replace />;
    }

    return children;
};

export default RoleRoute;
