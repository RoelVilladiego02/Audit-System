import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
            <div className="container-fluid">
                <Link className="navbar-brand" to="/">Audit System</Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto">
                        {user?.role === 'admin' && (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/admin">Dashboard</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/admin/questions">Manage Questions</Link>
                                </li>
                            </>
                        )}
                        {user?.role === 'user' && (
                            <>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/dashboard">Dashboard</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/audit">Audit Form</Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link" to="/submissions">My Submissions</Link>
                                </li>
                            </>
                        )}
                        {user && (
                            <li className="nav-item">
                                <Link className="nav-link" to="/analytics">Analytics</Link>
                            </li>
                        )}
                    </ul>
                    {user && (
                        <ul className="navbar-nav">
                            <li className="nav-item dropdown">
                                <button 
                                    className="nav-link dropdown-toggle bg-transparent border-0" 
                                    type="button" 
                                    data-bs-toggle="dropdown" 
                                    aria-expanded="false"
                                >
                                    {user.email}
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end">
                                    <li>
                                        <button className="dropdown-item" onClick={handleLogout}>
                                            Logout
                                        </button>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
