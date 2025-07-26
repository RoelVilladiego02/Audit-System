import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './useAuth';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return; // Prevent multiple submissions
        
        setError('');
        setIsLoading(true);

        try {
            const userData = await login(email, password);
            if (userData) {
                // Determine redirect based on user role
                let redirectTo = location.state?.from?.pathname;
                if (!redirectTo) {
                    // Default redirects based on role
                    if (userData.role === 'admin') {
                        redirectTo = '/admin';  // Admin dashboard
                    } else if (userData.role === 'user') {
                        redirectTo = '/dashboard';  // User dashboard
                    } else {
                        redirectTo = '/';       // Fallback to home
                    }
                }
                navigate(redirectTo, { replace: true }); // Using replace to prevent back button issues
            } else {
                setError('Login successful but failed to get user data. Please try again.');
                setIsLoading(false); // Reset loading state if we don't have user data
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
            setIsLoading(false);
        }
    };

    return (
        <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="card shadow-lg p-4" style={{ maxWidth: '400px' }}>
                <div className="card-body">
                    <h2 className="card-title text-center mb-4 h3">
                        Sign in to your account
                    </h2>
                    <p className="text-center text-muted mb-4">
                        Or{' '}
                        <Link to="/register" className="text-primary text-decoration-none">
                            create a new account
                        </Link>
                    </p>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="form-control"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="form-control"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="d-grid">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary"
                            >
                                {isLoading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
