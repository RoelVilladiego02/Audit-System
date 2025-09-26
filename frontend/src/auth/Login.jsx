import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './useAuth';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    // Removed local error state - using authError from AuthContext
    const [fieldErrors, setFieldErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [touchedFields, setTouchedFields] = useState({});
    
    const { login, user, error: authError, clearError } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
            navigate(redirectTo, { replace: true });
        }
    }, [user, navigate]);

    // Load remembered email and auto-fill email from registration
    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        const registrationEmail = location.state?.email;
        
        if (registrationEmail) {
            setFormData(prev => ({ ...prev, email: registrationEmail }));
        } else if (rememberedEmail) {
            setFormData(prev => ({ ...prev, email: rememberedEmail }));
            setRememberMe(true);
        }
    }, [location.state]);

    const validateField = (name, value) => {
        let error = '';

        switch (name) {
            case 'email':
                if (!value) {
                    error = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'Please enter a valid email address';
                } else if (value.length > 255) {
                    error = 'Email cannot exceed 255 characters';
                }
                break;

            case 'password':
                if (!value) {
                    error = 'Password is required';
                } else if (value.length < 6) {
                    error = 'Password must be at least 6 characters';
                }
                break;

            default:
                break;
        }

        if (error) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: error
            }));
        } else {
            setFieldErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        return !error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear errors when user starts typing
        if (authError) clearError();
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouchedFields(prev => ({
            ...prev,
            [name]: true
        }));
        
        // Validate field on blur
        validateField(name, formData[name]);
    };

    const validateForm = () => {
        let isValid = true;

        // Validate all fields
        Object.keys(formData).forEach(field => {
            if (!validateField(field, formData[field])) {
                isValid = false;
            }
        });

        // Mark all fields as touched
        setTouchedFields({
            email: true,
            password: true
        });

        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        // Client-side validation
        if (!validateForm()) {
            // Focus on first field with error
            const firstErrorField = Object.keys(fieldErrors).find(field => fieldErrors[field]);
            if (firstErrorField) {
                document.getElementById(firstErrorField)?.focus();
            }
            return;
        }

        clearError(); // Clear any previous auth errors
        setIsLoading(true);

        try {
            const userData = await login(formData.email.trim(), formData.password);
            
            if (userData) {
                // Handle remember me
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', formData.email.trim());
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
                // This shouldn't happen as login function should handle this
                console.error('Login successful but failed to retrieve user data');
            }
        } catch (err) {
            console.error('Login error:', err);
            
            // Use the error message from AuthContext (err.message contains the processed message)
            let errorMessage = err.message || 'An error occurred during login. Please try again.';
            
            // Handle server validation errors
            if (err.response?.data?.errors) {
                const serverErrors = err.response.data.errors;
                const newFieldErrors = {};
                
                Object.keys(serverErrors).forEach(field => {
                    if (Array.isArray(serverErrors[field])) {
                        newFieldErrors[field] = serverErrors[field][0];
                    } else {
                        newFieldErrors[field] = serverErrors[field];
                    }
                });
                
                setFieldErrors(prev => ({ ...prev, ...newFieldErrors }));
                errorMessage = 'Please correct the errors below.';
            }
            
            // Handle specific error cases for field highlighting
            if (err.response?.status === 401) {
                setFieldErrors({
                    email: 'Please check your credentials',
                    password: 'Please check your credentials'
                });
            }
            
            // Error is already set in AuthContext, no need to set it again
            
            // Focus on first field with error for better UX
            const firstErrorField = Object.keys(fieldErrors).find(field => fieldErrors[field]);
            if (firstErrorField) {
                setTimeout(() => {
                    document.getElementById(firstErrorField)?.focus();
                }, 100);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const getFieldValidationClass = (fieldName) => {
        if (!touchedFields[fieldName]) return '';
        return fieldErrors[fieldName] ? 'is-invalid' : formData[fieldName] ? 'is-valid' : '';
    };

    return (
        <div className="min-vh-100 d-flex align-items-center bg-light py-3">
            <div className="container-fluid px-3">
                <div className="row justify-content-center">
                    <div className="col-12 col-sm-8 col-md-6 col-lg-5 col-xl-4 col-xxl-3">
                        <div className="card shadow-lg border-0">
                            <div className="card-body p-3 p-sm-4 p-md-5">
                                {/* Header */}
                                <div className="text-center mb-4">
                                    <div className="mb-3">
                                        <i className="bi bi-shield-lock text-primary" style={{ fontSize: '2.5rem' }}></i>
                                    </div>
                                    <h1 className="h3 fw-bold text-dark mb-2">
                                        Welcome Back
                                    </h1>
                                    <p className="text-muted mb-0 small">
                                        Sign in to your account to continue
                                    </p>
                                </div>

                                {/* Error Alert */}
                                {authError && (
                                    <div className="alert alert-danger d-flex align-items-start mb-4" role="alert">
                                        <i className="bi bi-exclamation-triangle-fill me-2 mt-1 flex-shrink-0"></i>
                                        <div className="flex-grow-1">{authError}</div>
                                    </div>
                                )}

                                {/* Success message for redirects */}
                                {location.state?.message && (
                                    <div className="alert alert-success d-flex align-items-start mb-4" role="alert">
                                        <i className="bi bi-check-circle-fill me-2 mt-1 flex-shrink-0"></i>
                                        <div className="flex-grow-1">{location.state.message}</div>
                                    </div>
                                )}

                                {/* Login Form */}
                                <form onSubmit={handleSubmit} noValidate>
                                    {/* Email Field */}
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label fw-semibold small">
                                            Email Address <span className="text-danger">*</span>
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
                                                className={`form-control border-start-0 ps-0 ${getFieldValidationClass('email')}`}
                                                placeholder="Enter your email address"
                                                value={formData.email}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                disabled={isLoading}
                                                autoComplete="email"
                                                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                                            />
                                            {formData.email && !fieldErrors.email && touchedFields.email && (
                                                <span className="input-group-text bg-light border-start-0 text-success">
                                                    <i className="bi bi-check"></i>
                                                </span>
                                            )}
                                        </div>
                                        {fieldErrors.email && (
                                            <div id="email-error" className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.email}
                                            </div>
                                        )}
                                    </div>

                                    {/* Password Field */}
                                    <div className="mb-3">
                                        <label htmlFor="password" className="form-label fw-semibold small">
                                            Password <span className="text-danger">*</span>
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
                                                className={`form-control border-start-0 border-end-0 ps-0 ${getFieldValidationClass('password')}`}
                                                placeholder="Enter your password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                disabled={isLoading}
                                                autoComplete="current-password"
                                                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                                            />
                                            <button
                                                type="button"
                                                className="input-group-text bg-light border-start-0"
                                                onClick={togglePasswordVisibility}
                                                disabled={isLoading}
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
                                            </button>
                                        </div>
                                        {fieldErrors.password && (
                                            <div id="password-error" className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.password}
                                            </div>
                                        )}
                                    </div>

                                    {/* Remember Me & Forgot Password
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center flex-wrap">
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="rememberMe"
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    disabled={isLoading}
                                                />
                                                <label className="form-check-label text-muted small" htmlFor="rememberMe">
                                                    Remember me
                                                </label>
                                            </div>
                                            <div className="mt-2 mt-sm-0">
                                                <Link 
                                                    to="/forgot-password" 
                                                    className="text-primary text-decoration-none small"
                                                    tabIndex={isLoading ? -1 : 0}
                                                >
                                                    Forgot password?
                                                </Link>
                                            </div>
                                        </div>
                                    </div> */}

                                    {/* Submit Button */}
                                    <div className="d-grid mb-4">
                                        <button
                                            type="submit"
                                            disabled={isLoading || Object.values(fieldErrors).some(error => error)}
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
                                    <p className="text-muted mb-0 small">
                                        Don't have an account?{' '}
                                        <Link 
                                            to="/register" 
                                            className="text-primary text-decoration-none fw-semibold"
                                        >
                                            Create Account
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Additional Info */}
                        <div className="text-center mt-3">
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