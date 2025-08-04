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
    return `nav-link ${isActiveRoute(path) ? 'active fw-bold text-primary' : 'text-dark'}`;
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
    <nav className="navbar navbar-expand-lg bg-white shadow-sm border-bottom">
      <div className="container-fluid">
        {/* Brand */}
        <Link className="navbar-brand fw-bold d-flex align-items-center" to={getBrandPath()}>
          <i className="bi bi-shield-check me-2 text-primary" style={{ fontSize: '1.5rem' }}></i>
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
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {isAdmin && (
              <>
                <li className="nav-item">
                  <Link className={getNavLinkClass('/admin')} to="/admin" aria-label="Admin Dashboard">
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
                    aria-label="Management Options"
                  >
                    <i className="bi bi-gear me-1"></i>
                    Management
                  </button>
                  <ul className="dropdown-menu shadow-sm border-0">
                    <li>
                      <Link className="dropdown-item" to="/admin/questions" aria-label="Manage Questions">
                        <i className="bi bi-question-circle me-2"></i>
                        Manage Questions
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <Link className="dropdown-item" to="/admin/submissions" aria-label="Manage Submissions">
                        <i className="bi bi-file-text me-2"></i>
                        Manage Submissions
                      </Link>
                    </li>
                  </ul>
                </li>
                <li className="nav-item">
                  <Link className={getNavLinkClass('/analytics')} to="/analytics" aria-label="Analytics">
                    <i className="bi bi-bar-chart me-1"></i>
                    Analytics
                  </Link>
                </li>
              </>
            )}
            {isUser && (
              <>
                <li className="nav-item">
                  <Link className={getNavLinkClass('/dashboard')} to="/dashboard" aria-label="User Dashboard">
                    <i className="bi bi-house me-1"></i>
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={getNavLinkClass('/audit')} to="/audit" aria-label="New Audit">
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
                    aria-label="My Work Options"
                  >
                    <i className="bi bi-folder me-1"></i>
                    My Work
                  </button>
                  <ul className="dropdown-menu shadow-sm border-0">
                    <li>
                      <Link className="dropdown-item" to="/submissions" aria-label="My Submissions">
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
            <li className="nav-item dropdown">
              <button
                className="nav-link dropdown-toggle bg-transparent border-0 d-flex align-items-center"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                aria-label="User Profile Options"
              >
                <div className="d-flex align-items-center">
                  <div
                    className="rounded-circle bg-primary bg-opacity-25 d-flex align-items-center justify-content-center me-2"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <i className="bi bi-person-fill text-primary"></i>
                  </div>
                  <div className="d-none d-md-block text-start">
                    <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                      {user.name || 'User'}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
                    </div>
                  </div>
                </div>
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
                <li>
                  <div className="dropdown-header">
                    <div className="fw-bold text-dark">{user.name || 'User'}</div>
                    <div className="text-muted small">{user.email}</div>
                    <div className="text-muted small">
                      <i className="bi bi-person-badge me-1"></i>
                      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
                    </div>
                  </div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button
                    className="dropdown-item text-danger d-flex align-items-center"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    aria-label="Sign Out"
                  >
                    {isLoggingOut ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Signing out...</span>
                        </span>
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