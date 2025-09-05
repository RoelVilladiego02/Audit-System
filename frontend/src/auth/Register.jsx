import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './useAuth';
import api from '../api/axios';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: ''
    });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });

    const { register, user, clearAuthData } = useAuth();
    const navigate = useNavigate();

    // Clear any existing auth data when component mounts
    useEffect(() => {
        clearAuthData();
    }, [clearAuthData]);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
            navigate(redirectTo, { replace: true });
        }
    }, [user, navigate]);

    // Password strength checker
    const checkPasswordStrength = (password) => {
        let score = 0;
        let feedback = [];

        if (password.length >= 8) score++;
        else feedback.push('at least 8 characters');

        if (/[a-z]/.test(password)) score++;
        else feedback.push('lowercase letter');

        if (/[A-Z]/.test(password)) score++;
        else feedback.push('uppercase letter');

        if (/\d/.test(password)) score++;
        else feedback.push('number');

        if (/[^A-Za-z0-9]/.test(password)) score++;
        else feedback.push('special character');

        const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthColors = ['danger', 'danger', 'warning', 'info', 'success'];

        return {
            score,
            label: strengthLabels[score] || 'Very Weak',
            color: strengthColors[score] || 'danger',
            feedback: feedback.length > 0 ? `Missing: ${feedback.join(', ')}` : 'Strong password!'
        };
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear errors when user starts typing
        if (error) setError('');
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        // Check password strength
        if (name === 'password') {
            setPasswordStrength(checkPasswordStrength(value));
        }
    };

    const validateForm = () => {
        const errors = {};
        
        // Name validation
        if (!formData.name.trim()) {
            errors.name = 'Full name is required';
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters';
        }

        // Email validation
        if (!formData.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }

        // Password confirmation validation
        if (!formData.password_confirmation) {
            errors.password_confirmation = 'Please confirm your password';
        } else if (formData.password !== formData.password_confirmation) {
            errors.password_confirmation = 'Passwords do not match';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        if (!validateForm()) {
            setError('Please correct the errors below.');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Clear any existing authentication data before registration
            console.log('Clearing existing auth data before registration...');
            clearAuthData();
            
            // Wait a moment to ensure clearing is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const userData = await register(
                formData.name.trim(),
                formData.email.toLowerCase().trim(),
                formData.password,
                formData.password_confirmation
            );
            
            if (userData) {
                console.log('Registration successful for user:', {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role
                });
                
                // Don't auto-redirect, let the user manually navigate
                // This prevents accessing stale data
                navigate('/login', { 
                    replace: true,
                    state: { 
                        message: 'Registration successful! Please log in with your new account.' 
                    }
                });
            } else {
                setError('Registration completed but failed to log in automatically. Please try logging in manually.');
                setTimeout(() => {
                    navigate('/login', { 
                        replace: true,
                        state: { 
                            message: 'Registration successful! Please log in with your credentials.' 
                        }
                    });
                }, 3000);
            }
        } catch (err) {
            console.error('Registration error:', err);
            
            let errorMessage = 'Registration failed. Please try again.';
            
            // Handle validation errors from server
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
                
                setFieldErrors(newFieldErrors);
                errorMessage = 'Please correct the errors below.';
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.status === 422) {
                errorMessage = 'Invalid input. Please check your information and try again.';
            } else if (err.response?.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        if (field === 'password') {
            setShowPassword(!showPassword);
        } else {
            setShowConfirmPassword(!showConfirmPassword);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center bg-light py-4">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
                        <div className="card shadow-lg border-0">
                            <div className="card-body p-4 p-sm-5">
                                {/* Header */}
                                <div className="text-center mb-4">
                                    <div className="mb-3">
                                        <i className="bi bi-person-plus text-primary" style={{ fontSize: '3rem' }}></i>
                                    </div>
                                    <h1 className="h3 fw-bold text-dark mb-2">
                                        Create Account
                                    </h1>
                                    <p className="text-muted mb-0">
                                        Join our audit system today
                                    </p>
                                </div>

                                {/* Error Alert */}
                                {error && (
                                    <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                        <div>{error}</div>
                                    </div>
                                )}

                                {/* Registration Form */}
                                <form onSubmit={handleSubmit} noValidate>
                                    {/* Name Field */}
                                    <div className="mb-3">
                                        <label htmlFor="name" className="form-label fw-semibold">
                                            Full Name
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-person text-muted"></i>
                                            </span>
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                required
                                                className={`form-control border-start-0 ps-0 ${fieldErrors.name ? 'is-invalid' : ''}`}
                                                placeholder="Enter your full name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                disabled={isLoading}
                                                autoComplete="name"
                                            />
                                        </div>
                                        {fieldErrors.name && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.name}
                                            </div>
                                        )}
                                    </div>

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
                                                className={`form-control border-start-0 ps-0 ${fieldErrors.email ? 'is-invalid' : ''}`}
                                                placeholder="Enter your email address"
                                                value={formData.email}
                                                onChange={handleChange}
                                                disabled={isLoading}
                                                autoComplete="email"
                                            />
                                        </div>
                                        {fieldErrors.email && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.email}
                                            </div>
                                        )}
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
                                                className={`form-control border-start-0 border-end-0 ps-0 ${fieldErrors.password ? 'is-invalid' : ''}`}
                                                placeholder="Create a strong password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                disabled={isLoading}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="input-group-text bg-light border-start-0"
                                                onClick={() => togglePasswordVisibility('password')}
                                                disabled={isLoading}
                                            >
                                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
                                            </button>
                                        </div>
                                        
                                        {/* Password Strength Indicator */}
                                        {formData.password && (
                                            <div className="mt-2">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <small className="text-muted">Password strength:</small>
                                                    <small className={`text-${passwordStrength.color} fw-semibold`}>
                                                        {passwordStrength.label}
                                                    </small>
                                                </div>
                                                <div className="progress" style={{ height: '4px' }}>
                                                    <div
                                                        className={`progress-bar bg-${passwordStrength.color}`}
                                                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <small className={`text-${passwordStrength.color} d-block mt-1`}>
                                                    {passwordStrength.feedback}
                                                </small>
                                            </div>
                                        )}
                                        
                                        {fieldErrors.password && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.password}
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password Field */}
                                    <div className="mb-4">
                                        <label htmlFor="password_confirmation" className="form-label fw-semibold">
                                            Confirm Password
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-lock-fill text-muted"></i>
                                            </span>
                                            <input
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                type={showConfirmPassword ? "text" : "password"}
                                                required
                                                className={`form-control border-start-0 border-end-0 ps-0 ${fieldErrors.password_confirmation ? 'is-invalid' : ''}`}
                                                placeholder="Confirm your password"
                                                value={formData.password_confirmation}
                                                onChange={handleChange}
                                                disabled={isLoading}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="input-group-text bg-light border-start-0"
                                                onClick={() => togglePasswordVisibility('confirm')}
                                                disabled={isLoading}
                                            >
                                                <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
                                            </button>
                                        </div>
                                        
                                        {/* Password Match Indicator */}
                                        {formData.password_confirmation && formData.password && (
                                            <div className="mt-2">
                                                {formData.password === formData.password_confirmation ? (
                                                    <small className="text-success">
                                                        <i className="bi bi-check-circle me-1"></i>
                                                        Passwords match
                                                    </small>
                                                ) : (
                                                    <small className="text-danger">
                                                        <i className="bi bi-x-circle me-1"></i>
                                                        Passwords do not match
                                                    </small>
                                                )}
                                            </div>
                                        )}
                                        
                                        {fieldErrors.password_confirmation && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.password_confirmation}
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="d-grid mb-4">
                                        <button
                                            type="submit"
                                            disabled={isLoading || !formData.name || !formData.email || !formData.password || !formData.password_confirmation}
                                            className="btn btn-primary btn-lg fw-semibold"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Creating Account...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-person-plus me-2"></i>
                                                    Create Account
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* Footer */}
                                <div className="text-center">
                                    <p className="text-muted mb-0">
                                        Already have an account?{' '}
                                        <Link 
                                            to="/login" 
                                            className="text-primary text-decoration-none fw-semibold"
                                        >
                                            Sign In
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Additional Info */}
                        <div className="text-center mt-4">
                            <small className="text-muted">
                                <i className="bi bi-shield-check me-1"></i>
                                By creating an account, you agree to our terms of service
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;