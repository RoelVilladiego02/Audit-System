import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const Navbar = () => {
    const { user, logout, isAdmin, isUser } = useAuth();
    const location = useLocation();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const clearAllCookies = () => {
        document.cookie.split(';').forEach(cookie => {
            const [name] = cookie.split('=');
            document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        clearAllCookies();
        localStorage.clear();
        sessionStorage.clear();
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            window.location.href = '/login';
        }
    };

    const isActiveRoute = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const getNavLinkClass = (path) => {
        return `nav-link ${isActiveRoute(path) ? 'active fw-semibold' : ''}`;
    };

    const getBrandPath = () => {
        if (isAdmin) return '/admin';
        if (isUser) return '/dashboard';
        return '/';
    };

    if (!user) {
        // Don't render navbar if user is not authenticated
        return null;
    }

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
            <div className="container-fluid">
                {/* Brand */}
                <Link className="navbar-brand fw-bold d-flex align-items-center" to={getBrandPath()}>
                    <i className="bi bi-shield-check me-2" style={{ fontSize: '1.5rem' }}></i>
                    <span className="d-none d-sm-inline">Audit System</span>
                    <span className="d-sm-none">Audit</span>
                </Link>

                {/* Mobile Toggle Button */}
                <button 
                    className="navbar-toggler border-0" 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarNav">
                    {/* Main Navigation Links */}
                    <ul className="navbar-nav me-auto">
                        {isAdmin && (
                            <>
                                <li className="nav-item">
                                    <Link className={getNavLinkClass('/admin')} to="/admin">
                                        <i className="bi bi-speedometer2 me-1"></i>
                                        <span className="d-lg-inline d-none">Dashboard</span>
                                        <span className="d-lg-none">Dashboard</span>
                                    </Link>
                                </li>
                                <li className="nav-item dropdown">
                                    <button 
                                        className="nav-link dropdown-toggle bg-transparent border-0" 
                                        type="button" 
                                        data-bs-toggle="dropdown" 
                                        aria-expanded="false"
                                    >
                                        <i className="bi bi-gear me-1"></i>
                                        Management
                                    </button>
                                    <ul className="dropdown-menu">
                                        <li>
                                            <Link className="dropdown-item" to="/admin/questions">
                                                <i className="bi bi-question-circle me-2"></i>
                                                Manage Questions
                                            </Link>
                                        </li>
                                        <li><hr className="dropdown-divider" /></li>
                                        <li>
                                            <Link className="dropdown-item" to="/admin/submissions">
                                                <i className="bi bi-file-text me-2"></i>
                                                Manage Submissions
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                                <li className="nav-item">
                                    <Link className={getNavLinkClass('/analytics')} to="/analytics">
                                        <i className="bi bi-bar-chart me-1"></i>
                                        Analytics
                                    </Link>
                                </li>
                            </>
                        )}
                        
                        {isUser && (
                            <>
                                <li className="nav-item">
                                    <Link className={getNavLinkClass('/dashboard')} to="/dashboard">
                                        <i className="bi bi-house me-1"></i>
                                        Dashboard
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className={getNavLinkClass('/audit')} to="/audit">
                                        <i className="bi bi-clipboard-check me-1"></i>
                                        New Audit
                                    </Link>
                                </li>
                                <li className="nav-item dropdown">
                                    <button 
                                        className="nav-link dropdown-toggle bg-transparent border-0" 
                                        type="button" 
                                        data-bs-toggle="dropdown" 
                                        aria-expanded="false"
                                    >
                                        <i className="bi bi-folder me-1"></i>
                                        My Work
                                    </button>
                                    <ul className="dropdown-menu">
                                        <li>
                                            <Link className="dropdown-item" to="/submissions">
                                                <i className="bi bi-file-earmark-text me-2"></i>
                                                My Submissions
                                            </Link>
                                        </li>
                                    </ul>
                                </li>
                            </>
                        )}
                    </ul>

                    {/* User Profile Dropdown */}
                    <ul className="navbar-nav">

                        {/* User Profile Dropdown */}
                        <li className="nav-item dropdown">
                            <button 
                                className="nav-link dropdown-toggle bg-transparent border-0 d-flex align-items-center" 
                                type="button" 
                                data-bs-toggle="dropdown" 
                                aria-expanded="false"
                            >
                                <div className="d-flex align-items-center">
                                    <div className="rounded-circle bg-white bg-opacity-25 d-flex align-items-center justify-content-center me-2" 
                                         style={{ width: '32px', height: '32px' }}>
                                        <i className="bi bi-person-fill text-white"></i>
                                    </div>
                                    <div className="d-none d-md-block text-start">
                                        <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>
                                            {user.name || 'User'}
                                        </div>
                                        <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                                            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
                                        </div>
                                    </div>
                                </div>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end shadow">
                                <li>
                                    <div className="dropdown-header">
                                        <div className="fw-semibold">{user.name}</div>
                                        <div className="text-muted small">{user.email}</div>
                                        <div className="text-muted small">
                                            <i className="bi bi-person-badge me-1"></i>
                                            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                                        </div>
                                    </div>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <button 
                                        className="dropdown-item text-danger d-flex align-items-center" 
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                    >
                                        {isLoggingOut ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Signing out...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-box-arrow-right me-2"></i>
                                                Sign Out
                                            </>
                                        )}
                                    </button>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;