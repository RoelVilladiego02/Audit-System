import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const ProtectedRoute = ({ children, requiredRole, allowedRoles, fallbackPath }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted">Verifying access...</h5>
                    <p className="text-muted">Please wait while we check your permissions.</p>
                </div>
            </div>
        );
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return (
            <Navigate 
                to="/login" 
                state={{ 
                    from: location,
                    message: 'Please sign in to access this page.'
                }} 
                replace 
            />
        );
    }

    // Check role-based access
    if (requiredRole || allowedRoles) {
        const userRole = user?.role?.toLowerCase();
        let hasAccess = false;

        if (requiredRole) {
            // Single required role
            hasAccess = userRole === requiredRole.toLowerCase();
        } else if (allowedRoles) {
            // Multiple allowed roles
            const roles = Array.isArray(allowedRoles) 
                ? allowedRoles.map(role => role.toLowerCase())
                : allowedRoles.split(',').map(role => role.trim().toLowerCase());
            hasAccess = roles.includes(userRole);
        }

        if (!hasAccess) {
            // Determine where to redirect unauthorized users
            let redirectPath = fallbackPath;
            
            if (!redirectPath) {
                // Default redirect based on user role
                if (userRole === 'admin') {
                    redirectPath = '/admin';
                } else if (userRole === 'user') {
                    redirectPath = '/dashboard';
                } else {
                    redirectPath = '/';
                }
            }

            return (
                <Navigate 
                    to={redirectPath} 
                    state={{ 
                        message: 'You do not have permission to access that page.',
                        from: location
                    }} 
                    replace 
                />
            );
        }
    }

    // All checks passed, render the protected component
    return <>{children}</>;
};

// Specific route components for common use cases
export const AdminRoute = ({ children, fallbackPath = '/dashboard' }) => {
    return (
        <ProtectedRoute requiredRole="admin" fallbackPath={fallbackPath}>
            {children}
        </ProtectedRoute>
    );
};

export const UserRoute = ({ children, fallbackPath = '/admin' }) => {
    return (
        <ProtectedRoute requiredRole="user" fallbackPath={fallbackPath}>
            {children}
        </ProtectedRoute>
    );
};

export const AuthenticatedRoute = ({ children }) => {
    return (
        <ProtectedRoute>
            {children}
        </ProtectedRoute>
    );
};

// Component for handling access denied scenarios with better UX
export const AccessDenied = ({ 
    title = "Access Denied", 
    message = "You do not have permission to access this page.",
    redirectPath,
    redirectLabel = "Go to Dashboard"
}) => {
    const { user } = useAuth();
    
    const getDefaultRedirectPath = () => {
        if (redirectPath) return redirectPath;
        if (user?.role === 'admin') return '/admin';
        if (user?.role === 'user') return '/dashboard';
        return '/';
    };

    return (
        <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="text-center">
                <div className="mb-4">
                    <i className="bi bi-shield-exclamation text-warning" style={{ fontSize: '5rem' }}></i>
                </div>
                <h1 className="h2 fw-bold text-dark mb-3">{title}</h1>
                <p className="text-muted mb-4 lead">{message}</p>
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                    <Navigate 
                        to={getDefaultRedirectPath()} 
                        className="btn btn-primary"
                        replace
                    >
                        <i className="bi bi-house me-2"></i>
                        {redirectLabel}
                    </Navigate>
                    <button 
                        onClick={() => window.history.back()} 
                        className="btn btn-outline-secondary"
                    >
                        <i className="bi bi-arrow-left me-2"></i>
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProtectedRoute;