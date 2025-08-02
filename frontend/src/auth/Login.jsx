import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './useAuth';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
            navigate(redirectTo, { replace: true });
        }
    }, [user, navigate]);

    // Load remembered email
    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setFormData(prev => ({ ...prev, email: rememberedEmail }));
            setRememberMe(true);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        // Client-side validation
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields.');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const userData = await login(formData.email, formData.password);
            
            if (userData) {
                // Handle remember me
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', formData.email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                // Determine redirect path
                const from = location.state?.from?.pathname;
                let redirectTo = from;
                
                if (!redirectTo || redirectTo === '/login' || redirectTo === '/register') {
                    redirectTo = userData.role === 'admin' ? '/admin' : '/dashboard';
                }
                
                navigate(redirectTo, { replace: true });
            } else {
                setError('Login successful but failed to retrieve user data. Please try again.');
            }
        } catch (err) {
            console.error('Login error:', err);
            
            let errorMessage = 'An error occurred during login. Please try again.';
            
            if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            // Handle specific error cases
            if (err.response?.status === 401) {
                errorMessage = 'Invalid email or password. Please check your credentials.';
            } else if (err.response?.status === 422) {
                errorMessage = 'Please check your email format and try again.';
            } else if (err.response?.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="min-vh-100 d-flex align-items-center bg-light">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-12 col-sm-8 col-md-6 col-lg-5 col-xl-4">
                        <div className="card shadow-lg border-0">
                            <div className="card-body p-4 p-sm-5">
                                {/* Header */}
                                <div className="text-center mb-4">
                                    <div className="mb-3">
                                        <i className="bi bi-shield-lock text-primary" style={{ fontSize: '3rem' }}></i>
                                    </div>
                                    <h1 className="h3 fw-bold text-dark mb-2">
                                        Welcome Back
                                    </h1>
                                    <p className="text-muted mb-0">
                                        Sign in to your account to continue
                                    </p>
                                </div>

                                {/* Error Alert */}
                                {error && (
                                    <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                        <div>{error}</div>
                                    </div>
                                )}

                                {/* Success message for redirects */}
                                {location.state?.message && (
                                    <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
                                        <i className="bi bi-info-circle-fill me-2"></i>
                                        <div>{location.state.message}</div>
                                    </div>
                                )}

                                {/* Login Form */}
                                <form onSubmit={handleSubmit} noValidate>
                                    {/* Email Field */}
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label fw-semibold">
                                            Email Address
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-envelope text-muted"></i>
                                            </span>
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                required
                                                className={`form-control border-start-0 ps-0 ${error && !formData.email ? 'is-invalid' : ''}`}
                                                placeholder="Enter your email address"
                                                value={formData.email}
                                                onChange={handleChange}
                                                disabled={isLoading}
                                                autoComplete="email"
                                            />
                                        </div>
                                    </div>

                                    {/* Password Field */}
                                    <div className="mb-3">
                                        <label htmlFor="password" className="form-label fw-semibold">
                                            Password
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-lock text-muted"></i>
                                            </span>
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                required
                                                className={`form-control border-start-0 border-end-0 ps-0 ${error && !formData.password ? 'is-invalid' : ''}`}
                                                placeholder="Enter your password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                disabled={isLoading}
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                className="input-group-text bg-light border-start-0"
                                                onClick={togglePasswordVisibility}
                                                disabled={isLoading}
                                            >
                                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remember Me */}
                                    <div className="mb-4">
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="rememberMe"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                disabled={isLoading}
                                            />
                                            <label className="form-check-label text-muted" htmlFor="rememberMe">
                                                Remember my email address
                                            </label>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="d-grid mb-4">
                                        <button
                                            type="submit"
                                            disabled={isLoading || !formData.email || !formData.password}
                                            className="btn btn-primary btn-lg fw-semibold"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Signing in...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-box-arrow-in-right me-2"></i>
                                                    Sign In
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* Footer */}
                                <div className="text-center">
                                    <p className="text-muted mb-0">
                                        Don't have an account?{' '}
                                        <Link 
                                            to="/register" 
                                            className="text-primary text-decoration-none fw-semibold"
                                            style={{ color: 'var(--bs-primary) !important' }}
                                        >
                                            Create Account
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Additional Info */}
                        <div className="text-center mt-4">
                            <small className="text-muted">
                                <i className="bi bi-shield-check me-1"></i>
                                Your data is secure and protected
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;